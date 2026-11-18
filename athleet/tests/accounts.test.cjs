const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, require: name => load(path.resolve(path.dirname(file), `${name}.ts`)) };
  vm.runInNewContext(code, context);
  return context.exports;
}
const client = load(path.resolve(__dirname, '../src/lib/account-rules.ts'));
const { decide, mergeLogs } = load(path.resolve(__dirname, '../src/lib/sync-merge.ts'));

test('the app and the server agree on username and password rules', async () => {
  const server = await import(pathToFileURL(path.resolve(__dirname, '../../server/src/rules.js')).href);
  const usernames = ['ok', 'sam', 'Sam_99', 'a.b.c', '_lead', 'trail.', 'two__under', 'admin', 'Admin', 'x'.repeat(20), 'x'.repeat(21), 'has space', 'émile', 'me'];
  for (const u of usernames) assert.equal(client.usernameProblem(u), server.usernameProblem(u), `username "${u}"`);
  const passwords = ['', 'short', 'password123', 'Football', 'aaaaaaaa', 'correct horse battery', 'sam-is-great', 'x'.repeat(129), 'ok but long enough'];
  for (const p of passwords) assert.equal(client.passwordProblem(p, 'sam'), server.passwordProblem(p, 'sam'), `password "${p}"`);
  for (const k of ['USERNAME_MIN', 'USERNAME_MAX', 'PASSWORD_MIN', 'PASSWORD_MAX', 'DISPLAY_NAME_MAX']) assert.equal(client[k], server[k], k);
});

test('password strength meter', () => {
  assert.equal(client.passwordStrength(''), 0);
  assert.equal(client.passwordStrength('password'), 0);
  assert.ok(client.passwordStrength('correct horse battery staple') >= 3);
});

test('first sync after logging in lets the account win', () => {
  const server = { value: 'account', updatedAt: 10 };
  assert.equal(decide({ stamp: 999, hasValue: true }, server, true), 'pull', 'newer local data on a shared device must not overwrite the account');
  assert.equal(decide({ stamp: 999, hasValue: true }, undefined, true), 'push', 'a new account takes this device’s data');
  assert.equal(decide({ stamp: 0, hasValue: false }, undefined, true), 'none');
});

test('later syncs: last write wins', () => {
  const server = { value: 'x', updatedAt: 100 };
  assert.equal(decide({ stamp: 50, hasValue: true }, server, false), 'pull');
  assert.equal(decide({ stamp: 150, hasValue: true }, server, false), 'push');
  assert.equal(decide({ stamp: 100, hasValue: true }, server, false), 'none');
  assert.equal(decide({ stamp: 0, hasValue: true }, undefined, false), 'none', 'never-edited data isn’t pushed');
  assert.equal(decide({ stamp: 5, hasValue: true }, undefined, false), 'push');
});

test('workout history merges without duplicates or losses', () => {
  const a = [{ coachId: 'atlas', dayIndex: 0, finishedAt: 1 }, { coachId: 'atlas', dayIndex: 1, finishedAt: 3 }];
  const b = [{ coachId: 'atlas', dayIndex: 1, finishedAt: 3 }, { coachId: 'blitz', dayIndex: 0, finishedAt: 2 }];
  assert.equal(JSON.stringify(mergeLogs(a, b).map((l) => l.finishedAt)), '[1,2,3]');
  assert.equal(mergeLogs([], []).length, 0);
});
