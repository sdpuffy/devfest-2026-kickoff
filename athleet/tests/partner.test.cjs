const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, require: name => load(path.resolve(path.dirname(file), `${name}.ts`)) };
  vm.runInNewContext(code, context);
  return context.exports;
}
const src = (file) => path.resolve(__dirname, '../src', file);
const { COACHES } = load(src('data/coaches.ts'));
const { PROGRAMS } = load(src('data/workouts.ts'));
const { POSITIONS } = load(src('data/positions.ts'));
const { SOLO_VERSIONS } = load(src('data/partner-drills.ts'));
const { generatePlan } = load(src('lib/plan.ts'));
const { exerciseRecipe } = load(src('lib/exercise-rig.ts'));

const coach = (id) => COACHES.find((c) => c.id === id);
const profile = (over = {}) => ({ age: 24, sex: 'female', heightCm: 175, weightKg: 70, goal: 'sport_performance', sport: 'general', level: 'intermediate', daysPerWeek: 5, sessionMinutes: 60, equipment: 'full_gym', injuries: 'none', ...over });
const names = (plan) => plan.days.flatMap((d) => d.exercises.map((e) => e.name));

test('every partner drill exists somewhere and its solo version has a demo', () => {
  const all = new Set([
    ...Object.values(PROGRAMS).flatMap((p) => Object.values(p.days).flatMap((d) => d.exercises.map((e) => e.name))),
    ...Object.values(POSITIONS).flatMap((g) => g.positions.flatMap((p) => p.day.exercises.map((e) => e.name))),
  ]);
  for (const [drill, solo] of Object.entries(SOLO_VERSIONS)) {
    assert.ok(all.has(drill), `"${drill}" isn't prescribed anywhere`);
    assert.ok(!SOLO_VERSIONS[solo.name], `solo "${solo.name}" must not need a partner`);
    assert.ok(exerciseRecipe(solo.name), `no demo for "${solo.name}"`);
  }
});

test('training solo never prescribes a partner drill', () => {
  const setups = [...COACHES.map((c) => [c.id, undefined]), ...Object.entries(POSITIONS).flatMap(([id, g]) => g.positions.map((p) => [id, p.id]))];
  for (const [id, position] of setups) for (let days = 1; days <= 7; days++) {
    const solo = names(generatePlan(coach(id), profile({ position, daysPerWeek: days })));
    const partnerDrill = solo.find((n) => SOLO_VERSIONS[n]);
    assert.equal(partnerDrill, undefined, `${id}.${position ?? '-'} ${days} days`);
  }
});

test('a partner brings the partner drills back', () => {
  const solo = generatePlan(coach('blitz'), profile({ position: 'wr' }));
  const paired = generatePlan(coach('blitz'), profile({ position: 'wr', hasPartner: true }));
  assert.ok(names(solo).includes('Self-toss catching drills') && !names(solo).includes('Catching drills'));
  assert.ok(names(paired).includes('Catching drills'));
  assert.match(solo.why, /solo/);
  assert.match(paired.why, /partner/);
  // Sets and reps are unchanged; only the drill is.
  const pick = (plan, name) => plan.days.flatMap((d) => d.exercises).find((e) => e.name === name);
  assert.equal(pick(solo, 'Self-toss catching drills').reps, pick(paired, 'Catching drills').reps);
});

test("coaches without partner drills don't change", () => {
  for (const id of ['ironside', 'anvil', 'apex', 'tide']) {
    assert.deepEqual(names(generatePlan(coach(id), profile())), names(generatePlan(coach(id), profile({ hasPartner: true }))), id);
    assert.doesNotMatch(generatePlan(coach(id), profile()).why, /partner|solo/, id);
  }
});
