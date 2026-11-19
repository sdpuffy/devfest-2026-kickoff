import assert from 'node:assert/strict';
import { after, before, test as nodeTest } from 'node:test';

import { createApp } from '../src/app.js';

/** The full account test suite, run against the storage that `options()` sets up. */
export function accountSuite(label, options = async () => ({})) {
  let server, base;
  before(async () => {
    server = await createApp({ allowedOrigins: ['https://app.example'], signupsPerHour: 1000, ...(await options()) });
    await new Promise((resolve) => server.listen(0, resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => new Promise((resolve) => server.close(resolve)));
  const test = (name, fn) => nodeTest(`[${label}] ${name}`, fn);

  async function call(method, path, { body, token, headers = {} } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Athleet-Device': 'Test runner', ...(token && { Authorization: `Bearer ${token}` }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined, headers: res.headers };
  }
  let n = 0;
  const fresh = () => `runner${++n}`;
  const signup = (username = fresh(), password = 'correct horse battery') => call('POST', '/api/auth/signup', { body: { username, password } });
  const login = (username, password = 'correct horse battery') => call('POST', '/api/auth/login', { body: { username, password } });

  test('sign up, use the session, log out', async () => {
    const name = fresh();
    const res = await call('POST', '/api/auth/signup', { body: { username: name, password: 'correct horse battery', displayName: ' Sam <b> ' } });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.username, name);
    assert.equal(res.body.user.displayName, 'Sam b');
    assert.equal(typeof res.body.user.id, 'number');
    assert.match(res.body.recoveryCode, /^([A-Z2-9]{5}-){4}[A-Z2-9]{5}$/);
    assert.ok(res.body.token.length >= 40);
    assert.equal(res.body.user.password_hash, undefined, 'never leaks hashes');

    const me = await call('GET', '/api/account', { token: res.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.username, name);

    assert.equal((await call('POST', '/api/auth/logout', { token: res.body.token })).status, 204);
    assert.equal((await call('GET', '/api/account', { token: res.body.token })).status, 401);
  });

  test('usernames are unique regardless of case', async () => {
    const name = fresh();
    assert.equal((await signup(name)).status, 201);
    const again = await signup(name.toUpperCase());
    assert.equal(again.status, 409);
    assert.equal(again.body.error, 'username_taken');
  });

  test('login: any case works; wrong passwords get one message and are rate limited', async () => {
    const name = fresh();
    await signup(name);
    assert.equal((await login(name.toUpperCase())).status, 200);
    const wrong = await login(name, 'nope nope nope');
    const unknown = await login('nobody_here', 'nope nope nope');
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
    for (let i = 0; i < 4; i++) await login(name, 'nope nope nope');
    const locked = await login(name);
    assert.equal(locked.status, 429);
    assert.ok(Number(locked.headers.get('retry-after')) > 0);
  });

  test('recovery code resets the password once, signs out everywhere and is replaced', async () => {
    const name = fresh();
    const { body: first } = await signup(name);
    const recovered = await call('POST', '/api/auth/recover', { body: { username: name, recoveryCode: first.recoveryCode.toLowerCase().replace(/-/g, ' '), newPassword: 'a brand new phrase' } });
    assert.equal(recovered.status, 200);
    assert.notEqual(recovered.body.recoveryCode, first.recoveryCode);
    assert.equal((await call('GET', '/api/account', { token: first.token })).status, 401, 'old session revoked');
    assert.equal((await call('GET', '/api/account', { token: recovered.body.token })).status, 200, 'new session works');
    const reuse = await call('POST', '/api/auth/recover', { body: { username: name, recoveryCode: first.recoveryCode, newPassword: 'another new phrase' } });
    assert.equal(reuse.status, 401, 'old code no longer works');
    assert.equal((await login(name, 'a brand new phrase')).status, 200);
  });

  test('account settings: display name, username, password, recovery code', async () => {
    const name = fresh();
    const { body } = await signup(name);
    const token = body.token;
    const other = (await login(name)).body.token;

    assert.equal((await call('PATCH', '/api/account', { token, body: { displayName: 'Coach fan' } })).body.user.displayName, 'Coach fan');

    const renamedTo = `renamed_${n}`;
    assert.equal((await call('POST', '/api/account/username', { token, body: { username: renamedTo, password: 'wrong password' } })).status, 403);
    const renamed = await call('POST', '/api/account/username', { token, body: { username: renamedTo, password: 'correct horse battery' } });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.user.username, renamedTo);

    const changed = await call('POST', '/api/account/password', { token, body: { currentPassword: 'correct horse battery', newPassword: 'fresh strong phrase' } });
    assert.equal(changed.status, 200);
    assert.equal((await call('GET', '/api/account', { token: other })).status, 401, 'other devices signed out');
    assert.equal((await call('GET', '/api/account', { token })).status, 200, 'this device stays signed in');

    const code = await call('POST', '/api/account/recovery-code', { token, body: { password: 'fresh strong phrase' } });
    assert.match(code.body.recoveryCode, /^[A-Z2-9-]{29}$/);
  });

  test('sessions can be listed and revoked', async () => {
    const name = fresh();
    const { body } = await signup(name);
    const second = (await call('POST', '/api/auth/login', { body: { username: name, password: 'correct horse battery' }, headers: { 'X-Athleet-Device': 'Phone · iOS' } })).body;
    const list = await call('GET', '/api/account/sessions', { token: body.token });
    assert.equal(list.body.sessions.length, 2);
    assert.equal(list.body.sessions.filter((x) => x.current).length, 1);
    assert.ok(list.body.sessions.some((x) => x.device === 'Phone · iOS'));
    assert.equal(typeof list.body.sessions[0].lastUsedAt, 'number');
    assert.equal((await call('DELETE', `/api/account/sessions/${second.sessionId}`, { token: body.token })).status, 204);
    assert.equal((await call('GET', '/api/account', { token: second.token })).status, 401);
    // Another user can't revoke your sessions.
    const stranger = (await signup()).body.token;
    await call('DELETE', `/api/account/sessions/${body.sessionId}`, { token: stranger });
    assert.equal((await call('GET', '/api/account', { token: body.token })).status, 200);
    const third = (await login(name)).body.token;
    assert.equal((await call('POST', '/api/account/sessions/revoke-others', { token: body.token })).body.revoked, 1);
    assert.equal((await call('GET', '/api/account', { token: third })).status, 401);
  });

  test('sync stores whitelisted keys with last-write-wins per key', async () => {
    const { body } = await signup();
    const token = body.token;
    let res = await call('PUT', '/api/sync', { token, body: { changes: { profile: { value: { age: 30 }, updatedAt: 100 }, workoutLogs: { value: [1, 2], updatedAt: 100 } } } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.profile, { value: { age: 30 }, updatedAt: 100 });
    // Older write loses, newer wins.
    res = await call('PUT', '/api/sync', { token, body: { changes: { profile: { value: { age: 20 }, updatedAt: 50 }, workoutLogs: { value: [1, 2, 3], updatedAt: 200 } } } });
    assert.equal(res.body.data.profile.value.age, 30);
    assert.deepEqual(res.body.data.workoutLogs.value, [1, 2, 3]);
    assert.equal((await call('PUT', '/api/sync', { token, body: { changes: { secrets: { value: 1, updatedAt: 1 } } } })).status, 400);
    assert.equal((await call('GET', '/api/sync', { token })).body.data.workoutLogs.updatedAt, 200);
    // Text with quotes, unicode and null survive the round trip.
    res = await call('PUT', '/api/sync', { token, body: { changes: { selectedPlan: { value: { note: 'Coach’s "plan" 🏈', x: null }, updatedAt: 300 } } } });
    assert.deepEqual(res.body.data.selectedPlan.value, { note: 'Coach’s "plan" 🏈', x: null });
    // Each user only sees their own data.
    const stranger = (await signup()).body.token;
    assert.deepEqual((await call('GET', '/api/sync', { token: stranger })).body.data, {});
  });

  test('health lists the sync keys; workout settings and history-cleared time sync', async () => {
    const health = await call('GET', '/api/health');
    for (const key of ['workoutPrefs', 'historyClearedAt', 'workoutLogs']) assert.ok(health.body.syncKeys.includes(key), key);
    const { body } = await signup();
    const res = await call('PUT', '/api/sync', { token: body.token, body: { changes: {
      workoutPrefs: { value: { units: 'metric', weekStart: 'sunday' }, updatedAt: 10 },
      historyClearedAt: { value: 1234567890, updatedAt: 10 },
    } } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.workoutPrefs.value.units, 'metric');
    assert.equal(res.body.data.historyClearedAt.value, 1234567890);
  });

  test('sync rejects data over the size limit', async () => {
    const { body } = await signup();
    const big = 'x'.repeat(2.1 * 1024 * 1024);
    assert.equal((await call('PUT', '/api/sync', { token: body.token, body: { changes: { workoutLogs: { value: big, updatedAt: 1 } } } })).status, 413);
  });

  test('export and delete account', async () => {
    const name = fresh();
    const { body } = await signup(name);
    await call('PUT', '/api/sync', { token: body.token, body: { changes: { budget: { value: { mode: 'none' }, updatedAt: 1 } } } });
    const exported = await call('GET', '/api/account/export', { token: body.token });
    assert.equal(exported.body.account.username, name);
    assert.deepEqual(exported.body.data.budget.value, { mode: 'none' });
    assert.equal((await call('DELETE', '/api/account', { token: body.token, body: { password: 'correct horse battery', confirm: 'wrong' } })).status, 400);
    assert.equal((await call('DELETE', '/api/account', { token: body.token, body: { password: 'correct horse battery', confirm: name } })).status, 204);
    assert.equal((await call('GET', '/api/account', { token: body.token })).status, 401);
    assert.equal((await login(name)).status, 401);
    const again = await signup(name);
    assert.equal(again.status, 201, 'the name is free again');
    assert.deepEqual((await call('GET', '/api/sync', { token: again.body.token })).body.data, {}, 'old data is gone');
  });

  test('CORS only for allowed origins; bad input is rejected cleanly', async () => {
    const allowed = await fetch(base + '/api/health', { headers: { Origin: 'https://app.example' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.example');
    const blocked = await fetch(base + '/api/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
    const junk = await fetch(base + '/api/auth/login', { method: 'POST', body: '{not json' });
    assert.equal(junk.status, 400);
    const huge = await call('POST', '/api/auth/login', { body: { username: 'x', password: 'y'.repeat(20000) } });
    assert.equal(huge.status, 413);
    assert.equal((await call('GET', '/api/nope')).status, 404);
    assert.equal((await call('GET', '/api/sync', { token: 'forged' })).status, 401);
  });

  test('sign-ups are limited per network', async () => {
    const strict = await createApp({ signupsPerHour: 2, ...(await options()) });
    await new Promise((resolve) => strict.listen(0, resolve));
    const url = `http://127.0.0.1:${strict.address().port}/api/auth/signup`;
    const statuses = [];
    for (const username of [`limit_a${n}`, `limit_b${n}`, `limit_c${n}`]) {
      statuses.push((await fetch(url, { method: 'POST', body: JSON.stringify({ username, password: 'correct horse battery' }) })).status);
    }
    await new Promise((resolve) => strict.close(resolve));
    assert.deepEqual(statuses, [201, 201, 429]);
  });
}
