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
const { POSITIONS, getPosition, programForPosition, NO_POSITION } = load(src('data/positions.ts'));
const { generatePlan } = load(src('lib/plan.ts'));
const { exerciseRecipe } = load(src('lib/exercise-rig.ts'));
const { SOLO_VERSIONS } = load(src('data/partner-drills.ts'));

const coach = (id) => COACHES.find((c) => c.id === id);
const profile = (over = {}) => ({ age: 24, sex: 'male', heightCm: 185, weightKg: 90, goal: 'sport_performance', sport: 'general', level: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: 'full_gym', injuries: 'none', ...over });
const names = (plan) => plan.days.flatMap((d) => d.exercises.map((e) => e.name));

test('sport coaches offer positions; physique coaches do not', () => {
  const sports = COACHES.filter((c) => !['bodybuilding', 'fitness', 'calisthenics'].includes(c.sport)).map((c) => c.id).sort();
  assert.equal(JSON.stringify(Object.keys(POSITIONS).sort()), JSON.stringify(sports));
  assert.equal(getPosition('blitz', NO_POSITION), undefined);
  assert.equal(getPosition('ironside', 'qb'), undefined);
});

test('every position is wired to its coach program and every exercise has a demo', () => {
  for (const [coachId, group] of Object.entries(POSITIONS)) {
    const program = PROGRAMS[coachId];
    assert.ok(program.days[group.skillDay], `${coachId}: skill day "${group.skillDay}"`);
    assert.ok(group.positions.length >= 3, coachId);
    const ids = group.positions.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${coachId}: unique ids`);
    const programNames = new Set(Object.values(program.days).flatMap((d) => d.exercises.map((e) => e.name)));
    for (const p of group.positions) {
      assert.match(p.id, /^[a-z0-9]{1,20}$/, `${coachId}.${p.id}: id fits the API schema`);
      assert.ok(p.label && p.icon && p.hint && p.why && p.nutritionTips.length >= 2, `${coachId}.${p.id}: copy`);
      assert.ok(['mass', 'lean', 'fuel'].includes(p.meals));
      assert.ok(!p.calories || (p.calories > 0.9 && p.calories < 1.2), `${coachId}.${p.id}: sane calorie factor`);
      // Swaps must hit a real exercise, and additions a real day, or they silently do nothing.
      for (const from of Object.keys(p.swap ?? {})) assert.ok(programNames.has(from), `${coachId}.${p.id}: swap "${from}" not in program`);
      for (const day of Object.keys(p.add ?? {})) assert.ok(program.days[day], `${coachId}.${p.id}: add to unknown day "${day}"`);
      if (coachId === 'tide') assert.equal(p.day.venue, 'pool', `${p.id}: swim event day is in the pool`);
      const adapted = programForPosition(coachId, program, p);
      const all = Object.values(adapted.days).flatMap((d) => d.exercises.flatMap((e) => [e.name, e.easier, e.lowImpact])).filter(Boolean);
      for (const name of all) assert.ok(exerciseRecipe(name), `${coachId}.${p.id}: no demo for "${name}"`);
    }
  }
});

test('positions reshape the week without touching the base program', () => {
  const before = JSON.stringify(PROGRAMS.blitz);
  const qb = generatePlan(coach('blitz'), profile({ position: 'qb' }));
  const ol = generatePlan(coach('blitz'), profile({ position: 'ol' }));
  assert.equal(JSON.stringify(PROGRAMS.blitz), before, 'base program unchanged');
  assert.ok(names(qb).some((n) => /drop-back|football throwing/i.test(n)), 'QB throws');
  assert.ok(!names(qb).includes('Bench press'), 'QB skips heavy barbell bench');
  assert.ok(names(ol).some((n) => /kick slide|blocking sled/i.test(n)), 'lineman blocks');
  assert.ok(!names(ol).includes('40-yard sprints'), 'lineman sprints stay short');
  assert.match(qb.why, /quarterback/i);
  assert.ok(ol.nutrition.targets.calories > qb.nutrition.targets.calories, 'linemen eat more');
  assert.ok(ol.nutrition.tips[0] !== qb.nutrition.tips[0], 'position nutrition tips lead');
  // No position: the coach's normal plan.
  assert.deepEqual(names(generatePlan(coach('blitz'), profile({ position: NO_POSITION }))), names(generatePlan(coach('blitz'), profile())));
});

test('the position day shows up at every week length', () => {
  for (const [coachId, group] of Object.entries(POSITIONS)) {
    for (const p of group.positions) {
      // Solo plans (the default) use the solo version of partner drills.
      const own = new Set(p.day.exercises.flatMap((e) => [e.name, SOLO_VERSIONS[e.name]?.name]));
      for (let days = 1; days <= 7; days++) {
        const plan = generatePlan(coach(coachId), profile({ position: p.id, daysPerWeek: days, sessionMinutes: 60 }));
        assert.ok(names(plan).some((n) => own.has(n)), `${coachId}.${p.id}: ${days}-day week has no position work`);
        if (days >= 3) assert.ok(plan.days.some((d) => d.focus === p.day.focus), `${coachId}.${p.id}: ${days}-day week has no position day`);
      }
    }
  }
  // Swimmers on a one-day week get their own event in the pool.
  assert.equal(generatePlan(coach('tide'), profile({ position: 'breast', daysPerWeek: 1 })).days[0].focus, 'Pool: breaststroke');
});

test('goalkeepers run less and eat a little less than midfielders', () => {
  const gk = generatePlan(coach('vanguard'), profile({ position: 'gk', daysPerWeek: 5 }));
  const mid = generatePlan(coach('vanguard'), profile({ position: 'mid', daysPerWeek: 5 }));
  assert.ok(!names(gk).includes('200m sprints'));
  assert.ok(names(gk).some((n) => /goalkeeper diving/i.test(n)));
  assert.ok(gk.nutrition.targets.calories < mid.nutrition.targets.calories);
});
