import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Storage for users, sessions and synced data, behind one async interface with two drivers:
// - Turso (hosted libSQL, free tier) over its HTTP API when TURSO_DATABASE_URL is set. Used in
//   production, because free hosts like Render wipe local files on every restart.
// - A local SQLite file (node:sqlite) otherwise: development and tests.
// Both speak the same SQLite SQL. Each Turso request is a fresh connection, so nothing relies
// on per-connection state such as PRAGMA foreign_keys: deletes are done explicitly.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    recovery_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    password_changed_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    device TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)',
  `CREATE TABLE IF NOT EXISTS sync_items (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, key)
  )`,
];

// ── Drivers: all(sql, args) -> rows, run(sql, args) -> { changes }, batch([[sql, args]]) ──

async function sqliteDriver(path) {
  const { DatabaseSync } = await import('node:sqlite');
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  const prepared = new Map();
  const stmt = (sql) => { if (!prepared.has(sql)) prepared.set(sql, db.prepare(sql)); return prepared.get(sql); };
  return {
    all: async (sql, args = []) => stmt(sql).all(...args).map((row) => ({ ...row })),
    run: async (sql, args = []) => ({ changes: Number(stmt(sql).run(...args).changes) }),
    batch: async (statements) => {
      db.exec('BEGIN');
      try {
        for (const [sql, args = []] of statements) stmt(sql).run(...args);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    close: () => db.close(),
  };
}

/** Turso's "Hrana over HTTP" pipeline API, with plain fetch. */
function tursoDriver(url, token) {
  const endpoint = `${url.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '')}/v2/pipeline`;
  const encode = (v) => {
    if (v === null || v === undefined) return { type: 'null' };
    if (typeof v === 'number' || typeof v === 'bigint') {
      return Number.isInteger(Number(v)) ? { type: 'integer', value: String(v) } : { type: 'float', value: Number(v) };
    }
    return { type: 'text', value: String(v) };
  };
  const decode = (cell) => {
    if (!cell || cell.type === 'null') return null;
    if (cell.type === 'integer' || cell.type === 'float') return Number(cell.value);
    return cell.value;
  };
  async function pipeline(statements) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          ...statements.map(([sql, args = []]) => ({ type: 'execute', stmt: { sql, args: args.map(encode) } })),
          { type: 'close' },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const { results } = await res.json();
    return results.slice(0, statements.length).map((r) => {
      if (r.type !== 'ok') throw new Error(`Turso: ${r.error?.message ?? JSON.stringify(r.error)}`);
      return r.response.result;
    });
  }
  const rowsOf = (result) => result.rows.map((row) => Object.fromEntries(result.cols.map((c, i) => [c.name, decode(row[i])])));
  return {
    all: async (sql, args) => rowsOf((await pipeline([[sql, args]]))[0]),
    run: async (sql, args) => ({ changes: Number((await pipeline([[sql, args]]))[0].affected_row_count) }),
    // One HTTP request, in order, inside BEGIN/COMMIT.
    batch: async (statements) => { await pipeline([['BEGIN'], ...statements, ['COMMIT']]); },
    close: () => {},
  };
}

// ── Queries ──

export async function openDatabase({ path = ':memory:', tursoUrl, tursoToken } = {}) {
  const d = tursoUrl ? tursoDriver(tursoUrl, tursoToken) : await sqliteDriver(path);
  for (const sql of SCHEMA) await d.run(sql);
  const one = async (sql, args) => (await d.all(sql, args))[0];

  return {
    driver: tursoUrl ? 'turso' : 'sqlite',
    close: d.close,

    userById: (id) => one('SELECT * FROM users WHERE id = ?', [id]),
    userByName: (name) => one('SELECT * FROM users WHERE username = ?', [name]),
    insertUser: (username, displayName, passwordHash, recoveryHash, t) =>
      one('INSERT INTO users (username, display_name, password_hash, recovery_hash, created_at, password_changed_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
        [username, displayName, passwordHash, recoveryHash, t, t]),
    setRecovery: (id, hash) => d.run('UPDATE users SET recovery_hash = ? WHERE id = ?', [hash, id]),
    setUsername: (id, username) => d.run('UPDATE users SET username = ? WHERE id = ?', [username, id]),
    setDisplayName: (id, name) => d.run('UPDATE users SET display_name = ? WHERE id = ?', [name, id]),
    /** New password; signs out every session except `keepSessionId`. */
    changePassword: (id, hash, t, keepSessionId) => d.batch([
      ['UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?', [hash, t, id]],
      ['DELETE FROM sessions WHERE user_id = ? AND id != ?', [id, keepSessionId]],
    ]),
    /** Recovery: new password and code, every session signed out. */
    recover: (id, passwordHash, recoveryHash, t) => d.batch([
      ['UPDATE users SET password_hash = ?, recovery_hash = ?, password_changed_at = ? WHERE id = ?', [passwordHash, recoveryHash, t, id]],
      ['DELETE FROM sessions WHERE user_id = ?', [id]],
    ]),
    deleteUser: (id) => d.batch([
      ['DELETE FROM sessions WHERE user_id = ?', [id]],
      ['DELETE FROM sync_items WHERE user_id = ?', [id]],
      ['DELETE FROM users WHERE id = ?', [id]],
    ]),

    insertSession: (id, userId, tokenHash, device, t, expiresAt) =>
      d.run('INSERT INTO sessions (id, user_id, token_hash, device, created_at, last_used_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, userId, tokenHash, device, t, t, expiresAt]),
    sessionByToken: (hash) => one('SELECT * FROM sessions WHERE token_hash = ?', [hash]),
    touchSession: (id, t, expiresAt) => d.run('UPDATE sessions SET last_used_at = ?, expires_at = ? WHERE id = ?', [t, expiresAt, id]),
    sessionsFor: (userId, t) => d.all('SELECT id, device, created_at, last_used_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_used_at DESC', [userId, t]),
    deleteSession: (id, userId) => d.run('DELETE FROM sessions WHERE id = ? AND user_id = ?', [id, userId]),
    deleteOtherSessions: (userId, keepId) => d.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', [userId, keepId]),
    deleteExpired: (t) => d.run('DELETE FROM sessions WHERE expires_at <= ?', [t]),

    syncItems: (userId) => d.all('SELECT key, value, updated_at FROM sync_items WHERE user_id = ?', [userId]),
    syncBytesExcept: async (userId, keys) => {
      const rows = await d.all('SELECT key, LENGTH(value) AS bytes FROM sync_items WHERE user_id = ?', [userId]);
      return rows.filter((r) => !keys.includes(r.key)).reduce((sum, r) => sum + Number(r.bytes), 0);
    },
    /** Last write wins: only replaces a stored value that's older. */
    upsertSyncItems: (userId, items) => d.batch(items.map(({ key, value, updatedAt }) => [
      `INSERT INTO sync_items (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
       WHERE excluded.updated_at >= sync_items.updated_at`,
      [userId, key, value, updatedAt],
    ])),
  };
}
