import { createServer } from 'node:http';

import { openDatabase } from './db.js';
import { RateLimiter } from './rate-limit.js';
import { cleanDisplayName, passwordProblem, usernameProblem } from './rules.js';
import { burnTime, hashSecret, newId, newRecoveryCode, newToken, normalizeRecoveryCode, tokenHash, verifySecret } from './secrets.js';

// Athleet accounts: username + password (no email or phone), bearer-token sessions,
// one-time recovery codes, and per-key data sync. All routes live under /api.

const DAY = 24 * 60 * 60 * 1000;
const SESSION_DAYS = 30;
const SMALL_BODY = 16 * 1024;
const SYNC_BODY = 3 * 1024 * 1024;
const SYNC_TOTAL = 2 * 1024 * 1024;
/** What the app may store. Anything else is rejected. */
export const SYNC_KEYS = ['profile', 'selectedPlan', 'workoutLogs', 'historyClearedAt', 'appearance', 'dietary', 'budget', 'workoutPrefs'];

class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status; this.code = code; this.extra = extra;
  }
}
const bad = (code, message) => new HttpError(400, code, message);

/**
 * Builds the HTTP server. Storage: Turso when `tursoUrl` is given, else SQLite at `dbPath`.
 */
export async function createApp({
  dbPath = ':memory:', tursoUrl, tursoToken, allowedOrigins = [], trustProxy = false, signupsPerHour = 5, now = () => Date.now(),
} = {}) {
  const db = await openDatabase({ path: dbPath, tursoUrl, tursoToken });
  const limits = new RateLimiter(now);
  const origins = new Set(allowedOrigins);

  const userJson = (u) => ({ id: Number(u.id), username: u.username, displayName: u.display_name, createdAt: Number(u.created_at) });

  function clientIp(req) {
    if (trustProxy) {
      // The proxy appends the real client address last; earlier entries can be faked by the client.
      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',').pop().trim();
      if (forwarded) return forwarded;
    }
    return req.socket.remoteAddress ?? 'unknown';
  }

  function deviceLabel(req) {
    return String(req.headers['x-athleet-device'] ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60) || 'Unknown device';
  }

  async function startSession(userId, req) {
    const { token, hash } = newToken();
    const id = newId();
    const t = now();
    await db.insertSession(id, userId, hash, deviceLabel(req), t, t + SESSION_DAYS * DAY);
    return { token, sessionId: id };
  }

  /** The signed-in user and session, or a 401. Sliding expiry: each use extends it. */
  async function authenticate(req) {
    const match = /^Bearer (\S+)$/.exec(String(req.headers.authorization ?? ''));
    const session = match && await db.sessionByToken(tokenHash(match[1]));
    const t = now();
    if (!session || session.expires_at <= t) throw new HttpError(401, 'unauthorized', 'Your session has ended. Log in again.');
    const user = await db.userById(session.user_id);
    if (!user) throw new HttpError(401, 'unauthorized', 'Your session has ended. Log in again.');
    if (t - session.last_used_at > 60 * 1000) await db.touchSession(session.id, t, t + SESSION_DAYS * DAY);
    return { user, session };
  }

  function limit(key, max, windowMs, message = 'Too many attempts. Try again later.') {
    const hit = limits.hit(key, max, windowMs);
    if (!hit.ok) throw new HttpError(429, 'rate_limited', message, { retryAfter: hit.retryAfter });
  }

  /** Password check for sensitive changes, limited per user. */
  async function confirmPassword(user, password) {
    const key = `confirm:${user.id}`;
    if (!limits.allowed(key, 10)) throw new HttpError(429, 'rate_limited', 'Too many wrong passwords. Try again in a few minutes.');
    if (typeof password !== 'string' || !(await verifySecret(password, user.password_hash))) {
      limits.hit(key, 10, 15 * 60 * 1000);
      throw new HttpError(403, 'wrong_password', 'That password isn’t right.');
    }
  }

  async function syncState(userId) {
    const data = {};
    for (const row of await db.syncItems(userId)) data[row.key] = { value: JSON.parse(row.value), updatedAt: Number(row.updated_at) };
    return data;
  }

  // ── Routes ──
  const routes = {
    // syncKeys lets apps skip data this server doesn't store yet (e.g. a newer app, older server).
    'GET /api/health': async () => ({ ok: true, syncKeys: SYNC_KEYS }),

    'POST /api/auth/signup': async (req, body) => {
      limit(`signup:${clientIp(req)}`, signupsPerHour, 60 * 60 * 1000, 'Too many new accounts from this network. Try again later.');
      const username = typeof body.username === 'string' ? body.username.trim() : body.username;
      const problem = usernameProblem(username) ?? passwordProblem(body.password, username);
      if (problem) throw bad('invalid', problem);
      if (await db.userByName(username)) throw new HttpError(409, 'username_taken', 'That username is taken.');
      const recoveryCode = newRecoveryCode();
      const [passwordHash, recoveryHash] = await Promise.all([hashSecret(body.password), hashSecret(normalizeRecoveryCode(recoveryCode))]);
      let user;
      try {
        user = await db.insertUser(username, cleanDisplayName(body.displayName), passwordHash, recoveryHash, now());
      } catch (err) {
        // Someone took the name between the check and the insert.
        if (/UNIQUE/i.test(String(err?.message))) throw new HttpError(409, 'username_taken', 'That username is taken.');
        throw err;
      }
      return [201, { user: userJson(user), ...(await startSession(user.id, req)), recoveryCode }];
    },

    'POST /api/auth/login': async (req, body) => {
      const name = String(body.username ?? '').trim().toLowerCase();
      limit(`login-ip:${clientIp(req)}`, 30, 15 * 60 * 1000);
      if (!limits.allowed(`login:${name}`, 5)) {
        throw new HttpError(429, 'rate_limited', 'Too many wrong passwords for this account. Try again in 15 minutes, or use your recovery code.', { retryAfter: limits.retryAfter(`login:${name}`) });
      }
      const user = await db.userByName(name);
      const ok = user ? await verifySecret(String(body.password ?? ''), user.password_hash) : (await burnTime(body.password), false);
      if (!ok) {
        limits.hit(`login:${name}`, 5, 15 * 60 * 1000);
        throw new HttpError(401, 'wrong_credentials', 'Wrong username or password.');
      }
      limits.reset(`login:${name}`);
      return { user: userJson(user), ...(await startSession(user.id, req)) };
    },

    'POST /api/auth/recover': async (req, body) => {
      const name = String(body.username ?? '').trim().toLowerCase();
      limit(`recover-ip:${clientIp(req)}`, 20, 60 * 60 * 1000);
      limit(`recover:${name}`, 5, 60 * 60 * 1000, 'Too many recovery attempts. Try again in an hour.');
      const user = await db.userByName(name);
      const code = normalizeRecoveryCode(body.recoveryCode);
      const ok = user ? await verifySecret(code, user.recovery_hash) : (await burnTime(code), false);
      if (!ok) throw new HttpError(401, 'wrong_credentials', 'That username and recovery code don’t match.');
      const problem = passwordProblem(body.newPassword, user.username);
      if (problem) throw bad('invalid', problem);
      // The code is single-use: replace it, change the password and sign out everywhere.
      const recoveryCode = newRecoveryCode();
      const [passwordHash, recoveryHash] = await Promise.all([hashSecret(body.newPassword), hashSecret(normalizeRecoveryCode(recoveryCode))]);
      await db.recover(user.id, passwordHash, recoveryHash, now());
      limits.reset(`login:${name}`);
      return { user: userJson(user), ...(await startSession(user.id, req)), recoveryCode };
    },

    'POST /api/auth/logout': async (req) => {
      const { user, session } = await authenticate(req);
      await db.deleteSession(session.id, user.id);
      return [204];
    },

    'GET /api/account': async (req) => {
      const { user, session } = await authenticate(req);
      return { user: userJson(user), sessionId: session.id };
    },

    'PATCH /api/account': async (req, body) => {
      const { user } = await authenticate(req);
      if (body.displayName !== undefined) await db.setDisplayName(user.id, cleanDisplayName(body.displayName));
      return { user: userJson(await db.userById(user.id)) };
    },

    'POST /api/account/username': async (req, body) => {
      const { user } = await authenticate(req);
      await confirmPassword(user, body.password);
      const username = typeof body.username === 'string' ? body.username.trim() : body.username;
      const problem = usernameProblem(username);
      if (problem) throw bad('invalid', problem);
      const existing = await db.userByName(username);
      if (existing && existing.id !== user.id) throw new HttpError(409, 'username_taken', 'That username is taken.');
      if (body.password.toLowerCase().includes(username.toLowerCase())) {
        throw bad('invalid', 'Your password contains that username. Change your password first.');
      }
      await db.setUsername(user.id, username);
      return { user: userJson(await db.userById(user.id)) };
    },

    'POST /api/account/password': async (req, body) => {
      const { user, session } = await authenticate(req);
      await confirmPassword(user, body.currentPassword);
      const problem = passwordProblem(body.newPassword, user.username);
      if (problem) throw bad('invalid', problem);
      if (body.newPassword === body.currentPassword) throw bad('invalid', 'Pick a password you haven’t used here.');
      // Anyone who knew the old password is signed out.
      await db.changePassword(user.id, await hashSecret(body.newPassword), now(), session.id);
      return { user: userJson(user) };
    },

    'POST /api/account/recovery-code': async (req, body) => {
      const { user } = await authenticate(req);
      await confirmPassword(user, body.password);
      const recoveryCode = newRecoveryCode();
      await db.setRecovery(user.id, await hashSecret(normalizeRecoveryCode(recoveryCode)));
      return { recoveryCode };
    },

    'GET /api/account/sessions': async (req) => {
      const { user, session } = await authenticate(req);
      const sessions = (await db.sessionsFor(user.id, now())).map((x) => ({
        id: x.id, device: x.device, createdAt: Number(x.created_at), lastUsedAt: Number(x.last_used_at), current: x.id === session.id,
      }));
      return { sessions };
    },

    'POST /api/account/sessions/revoke-others': async (req) => {
      const { user, session } = await authenticate(req);
      const { changes } = await db.deleteOtherSessions(user.id, session.id);
      return { revoked: changes };
    },

    'GET /api/account/export': async (req) => {
      const { user } = await authenticate(req);
      const sessions = (await db.sessionsFor(user.id, now())).map((x) => ({ device: x.device, createdAt: Number(x.created_at), lastUsedAt: Number(x.last_used_at) }));
      return { exportedAt: now(), account: userJson(user), sessions, data: await syncState(user.id) };
    },

    'DELETE /api/account': async (req, body) => {
      const { user } = await authenticate(req);
      await confirmPassword(user, body.password);
      if (body.confirm !== user.username) throw bad('invalid', 'Type your username to confirm.');
      await db.deleteUser(user.id);
      return [204];
    },

    'GET /api/sync': async (req) => {
      const { user } = await authenticate(req);
      return { data: await syncState(user.id) };
    },

    'PUT /api/sync': async (req, body) => {
      const { user } = await authenticate(req);
      const changes = body.changes;
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw bad('invalid', 'Nothing to sync.');
      const latest = now() + 5 * 60 * 1000;
      const items = Object.entries(changes).map(([key, item]) => {
        if (!SYNC_KEYS.includes(key)) throw bad('invalid', `Unknown data "${key}".`);
        const updatedAt = Math.min(Number(item?.updatedAt), latest);
        if (!Number.isFinite(updatedAt) || updatedAt <= 0 || item.value === undefined) throw bad('invalid', `Bad data for "${key}".`);
        return { key, value: JSON.stringify(item.value), updatedAt: Math.round(updatedAt) };
      });
      const others = await db.syncBytesExcept(user.id, items.map((i) => i.key));
      if (others + items.reduce((sum, i) => sum + i.value.length, 0) > SYNC_TOTAL) {
        throw new HttpError(413, 'too_large', 'Your synced data is over the 2 MB limit.');
      }
      if (items.length) await db.upsertSyncItems(user.id, items); // last write wins, per key
      return { data: await syncState(user.id) };
    },
  };

  async function readBody(req, max) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > max) throw new HttpError(413, 'too_large', 'Request too large.');
      chunks.push(chunk);
    }
    if (!size) return {};
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      throw bad('invalid_json', 'Request body must be JSON.');
    }
  }

  function send(req, res, status, body) {
    const origin = req.headers.origin;
    if (origin && origins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (body === undefined) { res.writeHead(status); res.end(); return; }
    const json = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(json) });
    res.end(json);
  }

  async function handle(req, res) {
    const path = new URL(req.url ?? '/', 'http://x').pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      if (origin && origins.has(origin)) {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Athleet-Device');
        res.setHeader('Access-Control-Max-Age', '600');
      }
      return send(req, res, 204);
    }
    try {
      let route = routes[`${req.method} ${path}`];
      const sessionMatch = /^\/api\/account\/sessions\/([\w-]+)$/.exec(path);
      if (!route && req.method === 'DELETE' && sessionMatch) {
        route = async (r) => {
          const { user } = await authenticate(r);
          await db.deleteSession(sessionMatch[1], user.id);
          return [204];
        };
      }
      if (!route) throw new HttpError(404, 'not_found', 'Not found.');
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readBody(req, path === '/api/sync' ? SYNC_BODY : SMALL_BODY) : {};
      const result = await route(req, body);
      const [status, payload] = Array.isArray(result) ? result : [200, result];
      send(req, res, status, payload);
    } catch (err) {
      if (err instanceof HttpError) {
        if (err.extra.retryAfter) res.setHeader('Retry-After', String(err.extra.retryAfter));
        return send(req, res, err.status, { error: err.code, message: err.message, ...err.extra });
      }
      console.error('[athleet-server]', err);
      send(req, res, 500, { error: 'server_error', message: 'Something went wrong. Try again.' });
    }
  }

  // Drop expired sessions once an hour.
  const sweep = setInterval(() => void db.deleteExpired(now()).catch(() => {}), 60 * 60 * 1000);
  sweep.unref();

  const server = createServer((req, res) => void handle(req, res));
  server.on('close', () => { clearInterval(sweep); db.close(); });
  server.storage = db.driver;
  return server;
}
