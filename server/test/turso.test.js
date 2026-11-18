import { createServer } from 'node:http';
import { after } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import { accountSuite } from './suite.js';

// Runs the whole account suite through the Turso driver, against a stand-in for Turso's
// HTTP pipeline API (POST /v2/pipeline) backed by in-memory SQLite. It encodes values the
// way Turso documents them, integers as strings, so the driver's decoding is exercised.
//
// To test against a real Turso database instead, set TURSO_TEST_URL and TURSO_TEST_TOKEN.
// It creates real accounts named runner1, runner2… so use a throwaway database.

const TOKEN = 'test-token';
let fake;

function decodeArg(a) {
  if (a.type === 'null') return null;
  if (a.type === 'integer') return BigInt(a.value);
  if (a.type === 'float') return Number(a.value);
  return a.value;
}
function encodeCell(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'bigint' || (typeof v === 'number' && Number.isInteger(v))) return { type: 'integer', value: String(v) };
  if (typeof v === 'number') return { type: 'float', value: v };
  return { type: 'text', value: String(v) };
}

function startFakeTurso() {
  const db = new DatabaseSync(':memory:');
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (req.url !== '/v2/pipeline' || req.method !== 'POST') { res.writeHead(404); return res.end(); }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) { res.writeHead(401); return res.end('unauthorized'); }
    const { requests } = JSON.parse(Buffer.concat(chunks).toString());
    const results = requests.map((r) => {
      if (r.type === 'close') return { type: 'ok', response: { type: 'close' } };
      try {
        const stmt = db.prepare(r.stmt.sql);
        const args = (r.stmt.args ?? []).map(decodeArg);
        const cols = stmt.columns().map((c) => ({ name: c.name, decltype: c.type }));
        if (cols.length) {
          const rows = stmt.all(...args).map((row) => cols.map((c) => encodeCell(row[c.name])));
          return { type: 'ok', response: { type: 'execute', result: { cols, rows, affected_row_count: 0, last_insert_rowid: null } } };
        }
        const info = stmt.run(...args);
        return { type: 'ok', response: { type: 'execute', result: { cols: [], rows: [], affected_row_count: Number(info.changes), last_insert_rowid: String(info.lastInsertRowid) } } };
      } catch (err) {
        return { type: 'error', error: { message: err.message } };
      }
    });
    const json = JSON.stringify({ baton: null, base_url: null, results });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(json);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const real = process.env.TURSO_TEST_URL;
after(() => fake && new Promise((resolve) => fake.close(resolve)));

accountSuite(real ? 'turso (real)' : 'turso (stand-in)', async () => (real
  ? { tursoUrl: real, tursoToken: process.env.TURSO_TEST_TOKEN }
  : { tursoUrl: `http://127.0.0.1:${(fake ??= await startFakeTurso()).address().port}`, tursoToken: TOKEN }));
