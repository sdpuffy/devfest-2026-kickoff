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
const read = (file) => fs.readFileSync(src(file), 'utf8');
const { COACHES } = load(src('data/coaches.ts'));
const { PROGRAMS } = load(src('data/workouts.ts'));
const { SIGNATURES, HYPE } = load(src('data/hype.ts'));
const { suggestionsFor, SUGGESTION_ANSWERS } = load(src('data/suggestions.ts'));
const { COACH_LOOKS } = load(src('components/coach-art.ts'));
const { exerciseRecipe } = load(src('lib/exercise-rig.ts'));

test('every coach is fully wired up', () => {
  assert.equal(COACHES.length, 11);
  assert.equal(new Set(COACHES.map((c) => c.id)).size, COACHES.length, 'coach ids are unique');
  const recipes = read('data/recipes.ts'), venues = read('lib/venue-finder.ts'), personas = read('lib/personas.ts'), baseline = read('lib/baseline-engine.ts');
  for (const coach of COACHES) {
    const id = coach.id;
    assert.match(coach.name, /^Coach [A-Z][a-z]+$/, id);
    assert.ok(coach.greeting && coach.tagline && coach.bio && coach.signature.staples.length >= 6, `${id}: profile`);
    assert.ok(COACH_LOOKS[id], `${id}: character art`);
    assert.ok(PROGRAMS[id], `${id}: workout program`);
    assert.ok(SIGNATURES[id]?.text, `${id}: signature line`);
    for (const moment of ['setStart', 'rest', 'finish']) assert.ok(HYPE[id]?.[moment]?.length >= 2, `${id}: hype ${moment}`);
    // Coach-specific suggestions exist and each has a demo answer.
    const own = suggestionsFor(id, [], 20).filter((q) => SUGGESTION_ANSWERS[q.toLowerCase()] && !['Make my weekly plan'].includes(q));
    assert.ok(own.length >= 2, `${id}: suggested questions with answers`);
    assert.ok((recipes.match(new RegExp(`coachPicks: \\[[^\\]]*'${id}'`, 'g')) ?? []).length >= 3, `${id}: favourite recipes`);
    assert.ok(new RegExp(`bestForCoaches: \\[[^\\]]*'${id}'`).test(venues), `${id}: recommended venue`);
    assert.ok(personas.includes(`id: '${id}'`), `${id}: backend persona`);
    assert.ok(new RegExp(`\\n  ${id}: \\[`).test(baseline), `${id}: backup exercise bank`);
  }
});

test('every program covers 3-6 days with real day templates and demos', () => {
  for (const [id, program] of Object.entries(PROGRAMS)) {
    for (const days of [3, 4, 5, 6]) {
      for (const order of [program.order[days], program.sportOrder?.[days]].filter(Boolean)) {
        assert.equal(order.length, days, `${id}: ${days}-day order`);
        for (const key of order) assert.ok(program.days[key], `${id}: day "${key}"`);
      }
    }
    const names = Object.values(program.days).flatMap((d) => d.exercises.flatMap((e) => [e.name, e.easier, e.lowImpact])).concat(program.finisher.name).filter(Boolean);
    for (const name of names) assert.ok(exerciseRecipe(name), `${id}: no demo for "${name}"`);
  }
});

test('the sport coaches train their sport', () => {
  const skills = (id) => Object.values(PROGRAMS[id].days).flatMap((d) => d.exercises.map((e) => e.name)).join(' | ');
  assert.match(skills('blitz'), /3-point starts.*Pro agility shuttle|Catching drills/s);
  assert.match(skills('apex'), /Pull-up.*Dips.*Pistol squat.*Wall handstand hold/s);
  assert.match(skills('tide'), /Freestyle intervals.*Breaststroke drills.*Butterfly drills/s);
  assert.match(skills('diamond'), /Throwing progression.*Tee work.*Fielding ground balls/s);
  // Pool days only borrow pool work when a session is filled.
  assert.ok(Object.values(PROGRAMS.tide.days).some((d) => d.venue === 'pool'));
});
