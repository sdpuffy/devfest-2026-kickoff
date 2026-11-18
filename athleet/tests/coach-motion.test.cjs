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
const { coachPose, easeInOut } = load(path.resolve(__dirname, '../src/lib/coach-motion.ts'));
const quiet = { open: 0, width: 1, emphasis: 0, smile: 0, brow: 0, round: 0 };
test('all five motion states loop continuously with finite transforms', () => {
  for (const state of ['idle', 'thinking', 'talking', 'exercise', 'celebrate']) {
    for (let t = 0; t < 10; t += .02) assert.ok(Object.values(coachPose(t, state, false, quiet)).every(Number.isFinite));
    const before = coachPose(3.1 - .00001, state, false, quiet);
    const after = coachPose(3.1, state, false, quiet);
    for (const key of ['body', 'head', 'left', 'right', 'knee']) assert.ok(Math.abs(before[key] - after[key]) < .01, `${state} ${key}`);
  }
});
test('squat lowers the body and lifts both arms', () => {
  const pose = coachPose(3.1 * .49, 'exercise', false, quiet);
  assert.ok(pose.body > 20 && pose.knee > 50);
  assert.ok(pose.left > 60 && pose.right < -60);
});
test('speech mouth and brow shapes stop when talking ends', () => {
  const speech = { ...quiet, open: .85, width: .65, brow: .8, emphasis: 1 };
  const pose = coachPose(1, 'talking', false, speech);
  assert.ok(pose.mouth > .8 && pose.brow < 0);
  assert.equal(pose.width, .65);
  assert.equal(coachPose(1, 'idle', false, speech).mouth, .14);
});
test('reduced motion holds body poses while retaining speech feedback', () => {
  for (const state of ['idle', 'thinking', 'exercise', 'celebrate']) assert.deepEqual(coachPose(0, state, true, quiet), coachPose(2.8, state, true, quiet));
  assert.ok(coachPose(1, 'talking', true, { ...quiet, open: 1 }).mouth > .9);
});
test('transitions ease to rest at both endpoints', () => {
  assert.equal(easeInOut(0), 0); assert.equal(easeInOut(1), 1);
  assert.equal(easeInOut(.5), .5);
  assert.ok(easeInOut(.01) < .001 && 1 - easeInOut(.99) < .001);
});

test('every roster coach has distinct SVG art and all animated layers', () => {
  const { COACHES } = load(path.resolve(__dirname, '../src/data/coaches.ts'));
  const { coachArt, coachPortraits } = load(path.resolve(__dirname, '../src/components/coach-art.ts'));
  const heads = new Set();
  for (const coach of COACHES) {
    const art = coachArt[coach.id];
    assert.ok(art, `Missing character for ${coach.id}`);
    for (const layer of ['head', 'eyes', 'brows', 'mouth', 'body', 'left', 'right', 'leftThigh', 'rightThigh', 'leftShin', 'rightShin', 'leftShoe', 'rightShoe', 'detail', 'confetti']) {
      const svg = decodeURIComponent(art[layer].uri.split(',')[1]);
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${coach.id}: ${layer}`);
      assert.ok(!/undefined|NaN/.test(svg));
    }
    assert.ok(coachPortraits[coach.id]);
    heads.add(art.head.uri);
  }
  assert.equal(heads.size, COACHES.length);
});

const { exerciseRig, exerciseRecipe } = load(path.resolve(__dirname, '../src/lib/exercise-rig.ts'));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
test('V-up starts extended, folds both straight legs with the torso, and reaches toes', () => {
  const start = exerciseRig(0, 'V-up'), top = exerciseRig(2, 'V-up');
  assert.equal(start.shoulder.y, start.hip.y);
  assert.equal(start.legs[0][2].y, start.hip.y);
  assert.deepEqual(top.legs[0], top.legs[1]);
  assert.ok(top.shoulder.y < top.hip.y - 40);
  assert.ok(top.legs[0][2].y < top.hip.y - 50);
  assert.ok(distance(top.arms[0][2], top.legs[0][2]) < 12);
  for (let t = 0; t <= 4; t += .1) {
    const pose = exerciseRig(t, 'V-up');
    assert.ok(Math.abs(distance(pose.legs[0][0], pose.legs[0][2]) - 68) < .001, 'knees stay straight');
    assert.equal(pose.hip.y, 170, 'pelvis stays on the mat');
  }
});
test('push-up hands and feet stay planted and plank does not perform push-ups', () => {
  const a = exerciseRig(0, 'Push-up'), b = exerciseRig(2, 'Push-up');
  assert.deepEqual(a.arms[0][2], b.arms[0][2]);
  assert.deepEqual(a.legs[0][2], b.legs[0][2]);
  assert.ok(b.shoulder.y > a.shoulder.y + 20);
  assert.deepEqual(exerciseRig(0, 'Plank'), exerciseRig(2, 'Plank'));
});
test('curl keeps upper arm still; leg raise keeps torso down; unknown demos are explicit', () => {
  const a = exerciseRig(0, 'Dumbbell curl'), b = exerciseRig(2, 'Dumbbell curl');
  assert.deepEqual(a.arms[0][1], b.arms[0][1]);
  assert.notDeepEqual(a.arms[0][2], b.arms[0][2]);
  assert.deepEqual(exerciseRig(0, 'Lying leg raise').shoulder, exerciseRig(2, 'Lying leg raise').shoulder);
  assert.equal(exerciseRig(0, 'Unknown custom exercise'), null);
  assert.notEqual(exerciseRecipe('Bicycle crunch'), exerciseRecipe('Bike intervals'));
});
test('circuits play each listed movement in turn', () => {
  const name = 'HIIT circuit: squat jumps, mountain climbers';
  assert.equal(exerciseRecipe(name), 'seq:jumpsquat=Squat jumps|climber=Mountain climbers');
  assert.match(exerciseRig(1, name).cue, /^Squat jumps \(1 of 2\)/);
  assert.match(exerciseRig(9, name).cue, /^Mountain climbers \(2 of 2\)/);
  assert.equal(exerciseRecipe('Roundhouse kick drills'), 'roundhouse');
  assert.equal(exerciseRecipe('Flying sprints'), 'run');
  assert.equal(exerciseRecipe('Medicine ball rotational throw'), 'rotthrow');
});
test('every exercise the app can prescribe has a working demo', () => {
  const read = (file) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const names = new Set();
  for (const file of ['src/data/workouts.ts', 'src/lib/plan.ts']) {
    for (const m of read(file).matchAll(/\b(?:name|easier|lowImpact):\s*(['"])((?:(?!\1).)+)\1/g)) if (!m[2].includes('${')) names.add(m[2]);
    for (const m of read(file).matchAll(/\/i,\s*'([^']+)'\]/g)) names.add(m[1]); // kid-friendly swaps
  }
  for (const m of read('src/lib/plan.ts').matchAll(/'((?:Steady bike|Zone 2 cardio)[^']*)'/g)) names.add(m[1]);
  // Backup plan engine: exercise banks only (its day titles also use `name:`).
  for (const m of read('src/lib/baseline-engine.ts').matchAll(/name: (['"])(.+?)\1, defaultSets/g)) names.add(m[2]);
  assert.ok(names.size > 150);
  const missing = [...names].filter((name) => !exerciseRecipe(name));
  assert.deepEqual(missing, [], `No movement demo for: ${missing.join(', ')}`);
  for (const name of names) for (let t = 0; t < 24; t += .25) {
    const pose = exerciseRig(t, name);
    for (const chain of [...pose.arms, ...pose.legs]) {
      for (const pt of chain) assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y), name);
      assert.ok(distance(chain[0], chain[1]) > 20 && distance(chain[1], chain[2]) > 20, `${name} at ${t}s`);
    }
    for (const chain of pose.arms) assert.deepEqual(chain[0], pose.shoulder, name);
    for (const chain of pose.legs) assert.deepEqual(chain[0], pose.hip, name);
    assert.ok(pose.cue, name);
    if (pose.prop) assert.ok(Number.isFinite(pose.prop.at.x) && Number.isFinite(pose.prop.at.y), name);
  }
});
test('supported roster exercises have finite connected joints over a full rep', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/data/workouts.ts'), 'utf8');
  const names = [...source.matchAll(/(?:name|easier|lowImpact): '([^']+)'/g)].map(match => match[1]);
  for (const name of names) for (let t = 0; t < 4; t += .2) {
    const pose = exerciseRig(t, name);
    if (!pose) continue;
    for (const chain of [...pose.arms, ...pose.legs]) {
      for (const pt of chain) assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y), name);
      assert.ok(distance(chain[0], chain[1]) > 20, name);
      assert.ok(distance(chain[1], chain[2]) > 20, name);
    }
    for (const chain of pose.arms) assert.deepEqual(chain[0], pose.shoulder, name);
    for (const chain of pose.legs) assert.deepEqual(chain[0], pose.hip, name);
  }
});
