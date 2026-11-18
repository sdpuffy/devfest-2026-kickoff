import assert from 'node:assert/strict';
import { test } from 'node:test';

import { passwordProblem, usernameProblem } from '../src/rules.js';
import { accountSuite } from './suite.js';

test('rules reject weak usernames and passwords', () => {
  assert.equal(usernameProblem('ok_name.1'), null);
  for (const bad of ['ab', 'a'.repeat(21), 'has space', 'admin', '.dot', 'end_', 'two..dots', 'emoji😀']) assert.ok(usernameProblem(bad), bad);
  assert.equal(passwordProblem('correct horse battery', 'sam'), null);
  for (const bad of ['short', 'password123', 'aaaaaaaaaa', 'my-sam-password']) assert.ok(passwordProblem(bad, 'sam'), bad);
});

// Local SQLite file storage (development).
accountSuite('sqlite');
