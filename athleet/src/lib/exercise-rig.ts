export type Point = { x: number; y: number };
export type Limb = [Point, Point, Point];
export type Equipment =
  | 'mat' | 'bench' | 'weights' | 'bar' | 'none'
  | 'box' | 'handbench' | 'bag' | 'sled' | 'ladder' | 'cones' | 'wall' | 'roller' | 'climber' | 'pool' | 'mubar' | 'tee' | 'parallettes' | 'hurdle';
/** A moving object: a ball, medicine ball, football or kickboard. */
export type Prop = { kind: 'ball' | 'medball' | 'football' | 'board'; at: Point };
/** `held`: a racket or bat in the first arm's hand. */
export type ExerciseRig = { hip: Point; shoulder: Point; arms: [Limb, Limb]; legs: [Limb, Limb]; cue: string; equipment: Equipment; prop?: Prop; held?: 'racket' | 'bat' };
type Pose = { hip: Point; shoulder: Point; arms: [Limb, Limb]; legs: [Limb, Limb]; prop?: Prop; held?: 'racket' | 'bat' };

// Canvas is 360×200, floor at y≈183. Standing figures face right (+x); prone figures face left.
const point = (x: number, y: number): Point => ({ x, y });
const polar = (p: Point, length: number, degrees: number) => point(p.x + length * Math.cos(degrees * Math.PI / 180), p.y + length * Math.sin(degrees * Math.PI / 180));
const limb = (root: Point, a: number, b: number, length = 34): Limb => { const joint = polar(root, length, a); return [root, joint, polar(joint, length, b)]; };
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (1 - Math.cos(Math.min(1, Math.max(0, t)) * Math.PI)) / 2;
/** Solve a two-bone chain with fixed segment lengths and a planted hand/foot. */
function reach(root: Point, target: Point, length: number, bend = 1): Limb {
  const dx = target.x - root.x, dy = target.y - root.y;
  const span = Math.min(length * 2, Math.max(.001, Math.hypot(dx, dy)));
  const direction = Math.atan2(dy, dx);
  const angle = direction + bend * Math.acos(span / (2 * length));
  return [root, point(root.x + length * Math.cos(angle), root.y + length * Math.sin(angle)), Math.hypot(dx, dy) <= length * 2 + .00001 ? target : point(root.x + span * Math.cos(direction), root.y + span * Math.sin(direction))];
}

// ─── Key-pose blending (for multi-step movements) ───────────────────────────

const mixPoint = (a: Point, b: Point, t: number) => point(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
function toward(from: Point, to: Point, length: number): Point {
  const d = distance(from, to);
  return d < 1e-6 ? point(from.x + length, from.y) : point(from.x + (to.x - from.x) / d * length, from.y + (to.y - from.y) / d * length);
}
/** Blend two limbs without shrinking the bones. */
function mixLimb(a: Limb, b: Limb, root: Point, t: number): Limb {
  const upper = lerp(distance(a[0], a[1]), distance(b[0], b[1]), t), lower = lerp(distance(a[1], a[2]), distance(b[1], b[2]), t);
  const joint = toward(root, mixPoint(a[1], b[1], t), upper);
  return [root, joint, toward(joint, mixPoint(a[2], b[2], t), lower)];
}
/** Loop through key poses over `seconds`, easing between each pair. */
function keyframes(frames: Pose[], time: number, seconds: number): Pose & { index: number } {
  const f = ((((time / seconds) % 1) + 1) % 1) * frames.length;
  const index = Math.floor(f), t = ease(f - index);
  const a = frames[index], b = frames[(index + 1) % frames.length];
  const hip = mixPoint(a.hip, b.hip, t), shoulder = mixPoint(a.shoulder, b.shoulder, t);
  const prop: Prop | undefined = a.prop && b.prop ? { kind: b.prop.kind, at: mixPoint(a.prop.at, b.prop.at, t) } : t < .5 ? a.prop : b.prop;
  return {
    hip, shoulder, prop, index, held: a.held ?? b.held,
    arms: [mixLimb(a.arms[0], b.arms[0], shoulder, t), mixLimb(a.arms[1], b.arms[1], shoulder, t)],
    legs: [mixLimb(a.legs[0], b.legs[0], hip, t), mixLimb(a.legs[1], b.legs[1], hip, t)],
  };
}
/**
 * A standing-style pose. `lean` is degrees from vertical toward where the figure faces (+x).
 * Legs: two planted foot points, or a function building the limbs. Arms: absolute angles
 * [upper, lower] for each arm (the second arm defaults to the first), or a function.
 */
function figure(hip: Point, lean: number, legs: [Point, Point] | ((hip: Point) => [Limb, Limb]), arms: number[] | ((shoulder: Point) => [Limb, Limb])): Pose {
  const shoulder = polar(hip, 58, -90 + lean);
  const [a1, b1, a2 = a1, b2 = b1] = Array.isArray(arms) ? arms : [];
  return {
    hip, shoulder,
    legs: typeof legs === 'function' ? legs(hip) : [reach(hip, legs[0], 34, -1), reach(hip, legs[1], 34, -1)],
    arms: typeof arms === 'function' ? arms(shoulder) : [limb(shoulder, a1, b1, 28), limb(shoulder, a2, b2, 28)],
  };
}
const withBall = (pose: Pose, kind: Prop['kind'] = 'ball', arm = 0, dy = -6): Pose => ({ ...pose, prop: { kind, at: point(pose.arms[arm][2].x, pose.arms[arm][2].y + dy) } });
function mirror(pose: Pose): Pose {
  const m = (p: Point) => point(360 - p.x, p.y);
  const ml = (l: Limb): Limb => [m(l[0]), m(l[1]), m(l[2])];
  return { hip: m(pose.hip), shoulder: m(pose.shoulder), arms: [ml(pose.arms[0]), ml(pose.arms[1])], legs: [ml(pose.legs[0]), ml(pose.legs[1])], prop: pose.prop && { ...pose.prop, at: m(pose.prop.at) }, held: pose.held };
}
const standing = (x = 180): Pose => figure(point(x, 115), 0, [point(x + 6, 183), point(x - 4, 183)], [95, 95, 85, 85]);
const poseOf = ({ hip, shoulder, arms, legs, prop, held }: ExerciseRig): Pose => ({ hip, shoulder, arms, legs, prop, held });

// ─── Name → movement ────────────────────────────────────────────────────────

const recipes = [
  // Position drills (data/positions.ts), checked first: "rebounding" isn't bounding, a football throw isn't a baseball one.
  [/rebound/i, 'rebound'], [/diving save|goalkeeper diving/i, 'keeperdive'], [/header/i, 'header'], [/finishing|shots on goal/i, 'shot'],
  [/high ball|fly ball/i, 'highcatch'], [/football throw/i, 'qbthrow'], [/catcher blocking/i, 'block'], [/volley/i, 'volley'],
  [/hurdle/i, 'hurdle'], [/hip escape|shrimp/i, 'shrimp'], [/sprawl/i, 'sprawl'], [/bridge and roll/i, 'floorbridge'],
  [/block start/i, 'start3'], [/cutting/i, 'proagility'], [/kick slide/i, 'slide'], [/hand-fighting/i, 'shadowbox'],
  [/run-through|interval runs/i, 'run'], [/pop-up/i, 'bound'],
  // Swimming, baseball, football and calisthenics skills (checked first: "butterfly" isn't a chest fly).
  [/freestyle/i, 'freestyle'], [/backstroke/i, 'backstroke'], [/breaststroke/i, 'breaststroke'], [/butterfly/i, 'butterfly'],
  [/kickboard/i, 'kickboard'], [/streamline push-off/i, 'streamline'], [/streamline jump/i, 'streamlinejump'], [/flutter kick/i, 'flutter'],
  [/tee work|batting/i, 'bat'], [/throwing|pitching/i, 'throw'], [/fielding|ground ball/i, 'field'],
  [/pro agility|5-10-5/i, 'proagility'], [/backpedal/i, 'backpedal'], [/farmer'?s carry/i, 'carry'], [/catching/i, 'catch'],
  [/muscle-up/i, 'muscleup'], [/front lever/i, 'frontlever'], [/handstand/i, 'handstand'], [/l-sit/i, 'lsit'],
  [/hollow body/i, 'hollow'], [/pistol squat/i, 'pistol'], [/australian pull-up/i, 'invertedrow'],
  [/^v[- ]?up/i, 'vup'], [/dead bug/i, 'deadbug'], [/bird dog/i, 'birddog'],
  [/bicycle crunch|criss-cross/i, 'bicycle'], [/reverse crunch|rolling knee tuck/i, 'reverse'],
  [/hanging leg raise/i, 'hanging'], [/lying leg raise|leg raise \+ side sweeps|leg raise/i, 'legraise'],
  [/pilates hundred/i, 'hundred'], [/fitness ball transfer/i, 'balltransfer'],
  [/side plank/i, 'sideplank'], [/plank row/i, 'plankrow'], [/pike push-up/i, 'pike'], [/incline push-up/i, 'inclinepushup'],
  [/push-up/i, 'pushup'], [/burpee/i, 'burpee'], [/versaclimber/i, 'versa'], [/mountain climber|climbers?$/i, 'climber'],
  [/bear crawl/i, 'bearcrawl'],
  [/plank|pillar hold/i, 'plank'], [/ab rollout/i, 'rollout'],
  [/single-leg glute bridge/i, 'singlebridge'], [/glute bridge/i, 'floorbridge'], [/band hip extension|kickback/i, 'kickback'],
  [/hip thrust/i, 'bridge'], [/cable crunch/i, 'crunch'], [/russian twist/i, 'twist'],
  [/lying leg curl/i, 'legcurl'], [/leg extension/i, 'legextension'],
  [/leg press/i, 'legpress'], [/hip abduction/i, 'abduction'], [/lateral band walk/i, 'bandwalk'],
  [/power clean to push press/i, 'cleanpress'], [/power clean/i, 'clean'],
  [/single-leg romanian/i, 'singlehinge'], [/deadlift|good morning/i, 'hinge'],
  [/box jump/i, 'boxjump'], [/broad jump/i, 'broadjump'], [/jump squat|squat jump/i, 'jumpsquat'],
  [/bunny hop/i, 'bunnyhop'], [/bounding/i, 'bound'],
  [/lateral lunge|cossack/i, 'sidelunge'], [/split squat|lunge|step-back/i, 'lunge'], [/step-up/i, 'step'],
  [/squat/i, 'squat'], [/calf raise/i, 'calf'],
  [/landmine/i, 'landmine'], [/rotational throw/i, 'rotthrow'], [/chest pass/i, 'chestpass'], [/slam/i, 'slam'],
  [/rotational chop|woodchop/i, 'chop'],
  [/incline .*press/i, 'inclinepress'], [/bench press/i, 'benchpress'],
  [/shoulder press/i, 'overhead'], [/pull-up/i, 'pullup'], [/lat pulldown/i, 'pulldown'],
  [/inverted row/i, 'invertedrow'], [/seated cable row|rowing/i, 'seatedrow'], [/\brow\b/i, 'row'],
  [/overhead triceps/i, 'extension'], [/triceps pushdown/i, 'pushdown'], [/dips/i, 'dip'],
  [/external rotation/i, 'extrot'],
  [/curl/i, 'curl'], [/rear delt fly/i, 'rearfly'],
  [/bike|spin/i, 'bike'], [/sprints?\b|tempo runs|treadmill walk|shuttle run/i, 'run'],
  [/fly/i, 'fly'], [/lateral raise/i, 'raise'],
  [/kettlebell swing/i, 'swing'], [/front kick/i, 'kick'], [/roundhouse/i, 'roundhouse'], [/knee strike|muay thai knee/i, 'knee'],
  [/cable knee drive/i, 'kneedrive'], [/heavy bag/i, 'heavybag'], [/shadowbox/i, 'shadowbox'],
  [/jump rope/i, 'jumprope'], [/sled/i, 'sled'], [/3-point start/i, 'start3'],
  [/agility ladder|cone shuffle/i, 'ladder'], [/defensive slide|lateral shuffle/i, 'slide'], [/split-step/i, 'splitstep'],
  [/ball-handling/i, 'dribble'], [/cone dribbling/i, 'conedribble'], [/form shooting/i, 'shoot'],
  [/serve/i, 'serve'], [/wall passing/i, 'pass'], [/dance|zumba/i, 'dance'],
  [/foam roll/i, 'foamroll'], [/yoga/i, 'yoga'], [/stretching/i, 'stretch'], [/leg swing/i, 'legswing'], [/arm circle/i, 'armcircle'],
] as const;

// Named drills that are really several movements in a row.
const SEQUENCES: [RegExp, [string, string][]][] = [
  [/drop-back/i, [['backpedal', 'Drop back'], ['qbthrow', 'Set and throw']]],
  [/pocket movement/i, [['slide', 'Slide in the pocket'], ['qbthrow', 'Reset and throw']]],
  [/route running, solo/i, [['run', 'Release and stem'], ['proagility', 'Plant and break']]],
  [/route running/i, [['run', 'Release and stem'], ['catch', 'Break and catch']]],
  [/hip turn/i, [['backpedal', 'Backpedal'], ['run', 'Open your hips and run']]],
  [/post moves/i, [['dribble', 'Back down your defender'], ['shoot', 'Drop step to a hook shot']]],
  [/muay thai/i, [['knee', 'Knee strikes'], ['roundhouse', 'Roundhouse kicks']]],
  [/round circuit/i, [['shadowbox', 'Shadowboxing'], ['roundhouse', 'Roundhouse kicks'], ['knee', 'Knee strikes']]],
  [/ab circuit/i, [['bicycle', 'Bicycle crunches'], ['reverse', 'Reverse crunches'], ['legraise', 'Leg raises']]],
  [/hip mobility/i, [['legswing', 'Leg swings'], ['sidelunge', 'Cossack shifts'], ['lunge', 'Deep lunges']]],
  [/mobility (flow|and stretching)/i, [['yoga', 'Yoga flow'], ['stretch', 'Stretches'], ['armcircle', 'Arm circles']]],
  [/dynamic flexibility/i, [['legswing', 'Leg swings'], ['armcircle', 'Arm circles'], ['sidelunge', 'Side lunges']]],
  [/rally drills/i, [['splitstep', 'Split-step'], ['forehand', 'Forehand'], ['backhand', 'Backhand']]],
  [/shadow swings/i, [['forehand', 'Forehand'], ['backhand', 'Backhand']]],
  [/split-step \+ lateral shuffle/i, [['splitstep', 'Split-step'], ['slide', 'Lateral shuffle']]],
  [/bounding \/ bunny/i, [['bound', 'Bounding'], ['bunnyhop', 'Bunny hops']]],
  [/versaclimber or jump rope/i, [['versa', 'VersaClimber'], ['jumprope', 'Jump rope']]],
  [/jump rope or mountain climber/i, [['jumprope', 'Jump rope'], ['climber', 'Mountain climbers']]],
  [/versaclimber or bike/i, [['versa', 'VersaClimber'], ['bike', 'Bike']]],
];
const SECONDS_PER_PART = 8;

function single(name: string): string | null {
  return recipes.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}
/** The movement for an exercise name: one kind, or "seq:kind=Label|kind=Label" for a circuit. */
export function exerciseRecipe(name: string): string | null {
  const named = SEQUENCES.find(([pattern]) => pattern.test(name));
  if (named) return `seq:${named[1].map(([kind, label]) => `${kind}=${label}`).join('|')}`;
  // "HIIT circuit: burpees, jump squats, mountain climbers" → each listed movement in turn.
  const list = name.match(/:\s*(.+)$/);
  if (list) {
    const parts = list[1].split(/,|\+|\bor\b/i).map((item) => item.trim()).filter(Boolean)
      .map((item) => [/slow/i.test(item) && /climber/i.test(item) ? 'slowclimber' : single(item), item[0].toUpperCase() + item.slice(1)] as const)
      .filter(([kind]) => kind);
    if (parts.length > 1) return `seq:${parts.map(([kind, label]) => `${kind}=${label}`).join('|')}`;
    if (parts.length === 1) return parts[0][0];
  }
  return single(name);
}

export function exerciseRig(time: number, name: string): ExerciseRig | null {
  const kind = exerciseRecipe(name);
  if (!kind) return null;
  if (!kind.startsWith('seq:')) return build(kind, time);
  const parts = kind.slice(4).split('|').map((part) => part.split('=') as [string, string]);
  const index = Math.floor(Math.max(0, time) / SECONDS_PER_PART) % parts.length;
  const [part, label] = parts[index];
  const rig = build(part, Math.max(0, time) % SECONDS_PER_PART);
  return { ...rig, cue: `${label} (${index + 1} of ${parts.length}) · ${rig.cue}` };
}

function build(kind: string, time: number): ExerciseRig {
  const p = (1 - Math.cos(time * Math.PI / 2)) / 2;
  const alternate = (1 - Math.cos(time * Math.PI)) / 2;
  let hip = point(180, 115), shoulder = point(180, 57);
  let arms: [Limb, Limb] = [limb(shoulder, 85, 85, 28), limb(shoulder, 95, 95, 28)];
  let legs: [Limb, Limb] = [limb(hip, 80, 90), limb(hip, 100, 90)];
  let cue = '', equipment: Equipment = 'none';
  let prop: Prop | undefined;
  const bothArms = (a: number, b = a) => { arms = [limb(shoulder, a, b, 28), limb(shoulder, a, b, 28)]; };
  const bothLegs = (a: number, b = a) => { legs = [limb(hip, a, b), limb(hip, a, b)]; };
  const supine = () => { hip = point(185, 170); shoulder = point(127, 170); equipment = 'mat'; };
  const prone = (height = 130) => {
    const foot = point(268, 184);
    shoulder = point(foot.x - Math.sqrt(126 ** 2 - (foot.y - height) ** 2), height);
    hip = point(shoulder.x + (foot.x - shoulder.x) * 58 / 126, shoulder.y + (foot.y - shoulder.y) * 58 / 126);
    legs = [reach(hip, foot, 34, -1), reach(hip, foot, 34, -1)]; equipment = 'mat';
  };
  /** Use a blended key pose; `cues` gives one cue per key pose. */
  const play = (frames: Pose[], seconds: number, cues: string[], gear: Equipment = 'none'): ExerciseRig => {
    const pose = keyframes(frames, time, seconds);
    return { hip: pose.hip, shoulder: pose.shoulder, arms: pose.arms, legs: pose.legs, prop: pose.prop, held: pose.held, equipment: gear, cue: cues[Math.min(pose.index, cues.length - 1)] };
  };
  switch (kind) {
    case 'vup': case 'balltransfer': {
      supine();
      // One hip pivot: straight legs rise together while the trunk folds toward them.
      shoulder = polar(hip, 58, 180 + p * 60);
      bothLegs(-p * 60);
      bothArms(180 + p * 170);
      cue = p < .2 ? 'Extend long on the mat' : p > .8 ? 'Reach toward your toes' : 'Lift torso and straight legs together';
      if (kind === 'balltransfer') {
        // Pass the ball from hands to feet on one rep, back to the hands on the next.
        const inHands = Math.floor(time / 4) % 2 === 0 ? p < .9 : p > .9;
        const at = inHands ? arms[0][2] : legs[0][2];
        prop = { kind: 'ball', at: point(at.x, at.y - 7) };
        cue = p > .8 ? 'Pass the ball between hands and feet at the top' : 'Lift arms and legs together; lower with control';
      }
      break;
    }
    case 'legraise': case 'hanging': {
      if (kind === 'hanging') { hip = point(180, 110); shoulder = point(180, 52); bothArms(-90); equipment = 'bar'; bothLegs(90 - p * 90); }
      else { supine(); bothArms(0); bothLegs(-5 - p * 80); }
      cue = 'Keep legs together; lift and lower under control'; break;
    }
    case 'deadbug': case 'bicycle': {
      supine();
      const a = alternate, b = 1 - a;
      legs = [limb(hip, -90 + a * 80, -a * 10), limb(hip, -90 + b * 80, -b * 10)];
      arms = [limb(shoulder, -90 - b * 90, -90 - b * 90, 28), limb(shoulder, -90 - a * 90, -90 - a * 90, 28)];
      if (kind === 'bicycle') { shoulder = point(135, 145); bothArms(-120, 0); }
      cue = kind === 'deadbug' ? 'Extend opposite arm and leg; keep your back down' : 'Alternate knee toward the opposite elbow'; break;
    }
    case 'reverse': supine(); hip = point(185 - p * 10, 170 - p * 15); bothLegs(-75 - p * 40, -p * 40); bothArms(0); cue = 'Curl your pelvis up; bring knees toward chest'; break;
    case 'hundred': supine(); shoulder = point(132, 150); bothLegs(-25); bothArms(10 + Math.sin(time * 12) * 5); cue = 'Hold legs long; pulse arms beside your hips'; break;
    case 'pushup': case 'plank': case 'plankrow': case 'rollout': {
      const height = kind === 'pushup' ? 120 + p * 32 : 120;
      prone(height);
      arms = [reach(shoulder, point(140, 184), 34, -1), reach(shoulder, point(140, 184), 34, -1)];
      if (kind === 'plankrow') arms[1] = limb(shoulder, 50 + p * 60, 90, 28);
      if (kind === 'rollout') { shoulder = point(150 - p * 25, 120 + p * 25); arms = [reach(shoulder, point(120 - p * 30, 184), 34, -1), reach(shoulder, point(120 - p * 30, 184), 34, -1)]; }
      cue = kind === 'pushup' ? 'Lower and press as one straight line' : kind === 'plank' ? 'Hold a straight line; keep hips steady' : kind === 'rollout' ? 'Reach forward without dropping your hips' : 'Keep your trunk steady as you row'; break;
    }
    case 'inclinepushup': {
      prone(100 + p * 22);
      arms = [reach(shoulder, point(155, 150), 28, -1), reach(shoulder, point(155, 150), 28, -1)];
      equipment = 'handbench'; cue = 'Hands on the bench; lower your chest to the edge and press back'; break;
    }
    case 'pike': {
      hip = point(lerp(245, 232, p), lerp(125, 130, p)); shoulder = polar(hip, 58, lerp(150, 140, p));
      legs = [reach(hip, point(268, 184), 34, -1), reach(hip, point(268, 184), 34, -1)];
      arms = [reach(shoulder, point(150, 184), 28, 1), reach(shoulder, point(150, 184), 28, 1)];
      equipment = 'mat'; cue = 'Hips high; bend elbows to lower your head between your hands'; break;
    }
    case 'climber': case 'slowclimber': {
      prone(120);
      arms = [reach(shoulder, point(140, 184), 34, -1), reach(shoulder, point(140, 184), 34, -1)];
      const a = (1 - Math.cos(time * Math.PI * (kind === 'climber' ? 2 : 1))) / 2;
      const drive = (d: number) => reach(hip, point(268 - d * 75, 184 - d * 6), 34, 1);
      legs = [drive(a), drive(1 - a)];
      cue = kind === 'climber' ? 'Hold a strong plank; drive knees toward your chest fast' : 'Hold a strong plank; step one knee in at a time'; break;
    }
    case 'bearcrawl': {
      hip = point(200, 138); shoulder = polar(hip, 58, 182);
      const a = alternate, b = 1 - a, lift = (d: number) => Math.sin(d * Math.PI) * 8;
      arms = [reach(shoulder, point(130 - a * 12, 184 - lift(a)), 28, 1), reach(shoulder, point(130 - b * 12, 184 - lift(b)), 28, 1)];
      legs = [reach(hip, point(226 - b * 12, 184 - lift(b)), 34, 1), reach(hip, point(226 - a * 12, 184 - lift(a)), 34, 1)];
      equipment = 'mat'; cue = 'Knees hover just off the floor; step opposite hand and foot together'; break;
    }
    case 'sideplank': prone(110); arms = [reach(shoulder, point(150, 178), 34), limb(shoulder, -90, -90, 28)]; cue = 'Stack feet and shoulders; hold your hips up'; break;
    case 'birddog': case 'kickback': {
      prone(120);
      legs = [limb(hip, 90, 0), limb(hip, 90 - p * 90, 0)];
      arms = kind === 'birddog' ? [limb(shoulder, 90, 90, 28), limb(shoulder, 90 + p * 90, 90 + p * 90, 28)] : [limb(shoulder, 90, 90, 28), limb(shoulder, 92, 92, 28)];
      cue = kind === 'birddog' ? 'Reach opposite arm and leg; keep your back level' : 'Press the heel back against the band; keep your back flat'; break;
    }
    case 'bridge': hip = point(195, 165 - p * 36); shoulder = point(140, 135); legs = [reach(hip, point(248, 183), 34, -1), reach(hip, point(248, 183), 34, -1)]; bothArms(30); equipment = 'bench'; cue = 'Drive hips up; keep feet planted'; break;
    case 'floorbridge': case 'singlebridge': {
      hip = point(190, 170 - p * 30);
      shoulder = polar(hip, 58, Math.atan2(176 - hip.y, 128 - hip.x) * 180 / Math.PI);
      legs = [reach(hip, point(232, 183), 34, -1), reach(hip, point(232, 183), 34, -1)];
      if (kind === 'singlebridge') { const thigh = Math.atan2(legs[0][1].y - hip.y, legs[0][1].x - hip.x) * 180 / Math.PI; legs[1] = limb(hip, thigh, thigh); }
      bothArms(5, 0); equipment = 'mat';
      cue = kind === 'floorbridge' ? 'Feet flat; squeeze your glutes to lift your hips' : 'One leg long; drive through the planted heel'; break;
    }
    case 'crunch': hip = point(190, 132); shoulder = polar(hip, 58, -90 - p * 40); bothLegs(90, 0); bothArms(-110, 30); cue = 'Round your upper trunk toward your knees'; break;
    case 'twist': supine(); shoulder = polar(hip, 58, 230); bothLegs(-35, 35); bothArms(-20 + (alternate - .5) * 60); cue = 'Rotate your shoulders side to side'; break;
    case 'legcurl': hip = point(195, 140); shoulder = point(137, 140); bothLegs(0, -p * 100); bothArms(80); equipment = 'bench'; cue = 'Keep thighs down; curl heels toward glutes'; break;
    case 'legextension': hip = point(170, 120); shoulder = point(170, 62); bothLegs(0, 90 - p * 90); bothArms(90); equipment = 'bench'; cue = 'Keep thighs still; straighten at the knees'; break;
    case 'legpress': hip = point(160, 145); shoulder = point(120, 103); bothLegs(-60 + p * 25, 20 - p * 55); bothArms(70); equipment = 'bench'; cue = 'Press through both feet; bend knees on the return'; break;
    case 'abduction': hip = point(180, 120); shoulder = point(180, 62); legs = [limb(hip, 35 + p * 35, 90), limb(hip, 145 - p * 35, 90)]; bothArms(90); equipment = 'bench'; cue = 'Open knees outward with your trunk still'; break;
    case 'squat': case 'lunge': case 'sidelunge': case 'step': {
      hip = point(180 - p * 22, 115 + p * 30); shoulder = polar(hip, 58, -90 + p * 15);
      const split = kind === 'squat' ? 12 : 42;
      legs = [reach(hip, point(180 + split, 183), 38, -1), reach(hip, point(180 - split, 183), 38, -1)];
      if (kind === 'step') { hip = point(180 + p * 20, 115 - p * 22); shoulder = polar(hip, 58, -90); legs = [reach(hip, point(215, 158), 38, -1), reach(hip, point(165 + p * 35, 183 - p * 25), 38, -1)]; }
      bothArms(-15, -15); cue = kind === 'squat' ? 'Sit hips back and down; keep feet planted' : kind === 'step' ? 'Drive through the foot on the step' : 'Lower through the front knee; rise under control'; break;
    }
    case 'hinge': case 'singlehinge': case 'swing': {
      hip = point(180 - p * 14, 115 + p * 5); shoulder = polar(hip, 58, -90 + p * 65);
      legs = [reach(hip, point(190, 183), 36, -1), reach(hip, point(180, 183), 36, -1)];
      if (kind === 'singlehinge') legs[1] = limb(hip, 90 + p * 85, 90 + p * 85);
      bothArms(kind === 'swing' ? 10 + p * 80 : 90); equipment = 'weights'; cue = 'Hinge at the hips; keep your back long'; break;
    }
    case 'benchpress': case 'inclinepress': case 'fly': {
      hip = point(190, 135); shoulder = polar(hip, 58, kind === 'inclinepress' ? 210 : 180); bothLegs(20, 90);
      arms = [limb(shoulder, 20 - p * 110, -90, 28), limb(shoulder, 160 - p * 250, -90, 28)];
      if (kind === 'fly') arms = [limb(shoulder, -15 - p * 75, -30 - p * 60, 28), limb(shoulder, -165 + p * 75, -150 + p * 60, 28)];
      equipment = 'bench'; cue = kind === 'fly' ? 'Bring hands together above your chest' : 'Press above the chest; lower with elbows bent'; break;
    }
    case 'overhead': case 'pulldown': case 'pullup': {
      const lift = kind === 'pulldown' ? 1 - p : p;
      if (kind === 'pullup') { hip.y -= p * 30; shoulder.y -= p * 30; legs = [limb(hip, 90, 60), limb(hip, 90, 60)]; }
      arms = [limb(shoulder, 0 - lift * 90, -90, 28), limb(shoulder, 180 + lift * 90, -90, 28)];
      if (kind === 'pullup') arms = [reach(shoulder, point(160, 15), 28, -1), reach(shoulder, point(200, 15), 28, 1)];
      equipment = kind === 'overhead' ? 'weights' : 'bar'; cue = kind === 'overhead' ? 'Press overhead; lower to shoulder height' : 'Pull elbows down toward your sides'; break;
    }
    case 'row': case 'seatedrow': case 'invertedrow': case 'rearfly': {
      if (kind === 'row' || kind === 'rearfly') shoulder = polar(hip, 58, -35);
      if (kind === 'seatedrow') { hip = point(175, 125); shoulder = point(175, 67); bothLegs(20, 20); }
      if (kind === 'invertedrow') { hip = point(210, 145 - p * 20); shoulder = point(155, 130 - p * 20); bothLegs(20); }
      bothArms(80 + p * 50, 90 - p * 80); equipment = 'weights'; cue = 'Pull elbows back; return without swinging'; break;
    }
    case 'curl': bothArms(90, 90 - p * 140); equipment = 'weights'; cue = 'Keep upper arms still; bend only at the elbows'; break;
    case 'pushdown': bothArms(90, -15 + p * 105); cue = 'Keep elbows by your sides; straighten your arms'; break;
    case 'extension': bothArms(-90, 70 - p * 160); equipment = 'weights'; cue = 'Keep upper arms overhead; extend your elbows'; break;
    case 'extrot': {
      // Front view, seen slightly from above: elbows pinned, forearms swing outward.
      legs = [reach(hip, point(168, 183), 34, 1), reach(hip, point(192, 183), 34, -1)];
      const forearm = (side: number) => {
        const elbow = polar(shoulder, 28, 90 + side * 12), turn = (-50 + p * 110) * Math.PI / 180;
        return [shoulder, elbow, point(elbow.x + side * 28 * Math.sin(turn), elbow.y + 28 * Math.cos(turn) * .77)] as Limb;
      };
      arms = [forearm(1), forearm(-1)];
      cue = 'Elbows pinned to your sides; rotate your forearms out against the band'; break;
    }
    case 'dip': hip.y += p * 25; shoulder.y += p * 25; arms = [reach(shoulder, point(155, 110), 30), reach(shoulder, point(205, 110), 30)]; bothLegs(75, 130); equipment = 'bar'; cue = 'Bend elbows to lower; press back up'; break;
    case 'raise': arms = [limb(shoulder, 90 - p * 90, 90 - p * 90, 28), limb(shoulder, 90 + p * 90, 90 + p * 90, 28)]; equipment = 'weights'; cue = 'Lift out to shoulder height with soft elbows'; break;
    case 'calf': hip.y -= p * 9; shoulder.y -= p * 9; bothLegs(90); bothArms(90); cue = 'Rise onto toes; lower your heels slowly'; break;
    case 'kick': case 'kneedrive': legs[0] = limb(hip, 90 - p * 150, kind === 'kick' ? 90 - p * 150 : 90); bothArms(-50, -100); cue = 'Lift the knee, extend, then return to stance'; break;
    case 'roundhouse': {
      const chamber = Math.min(1, p * 2), extend = Math.max(0, p * 2 - 1), thigh = 90 - 100 * chamber;
      shoulder = polar(hip, 58, -90 - 22 * chamber);
      legs = [limb(hip, thigh, thigh + 140 * (1 - extend)), reach(hip, point(168, 183), 34, -1)];
      arms = [limb(shoulder, 70, -100, 28), limb(shoulder, 110, -60, 28)];
      cue = extend > 0 ? 'Turn the hip over and snap the shin through at hip height' : 'Hands up; chamber the knee and pivot on the standing foot'; break;
    }
    case 'knee': {
      shoulder = polar(hip, 58, -90 - 12 * p);
      legs = [limb(hip, 90 - 120 * p, 90 + 60 * p), reach(hip, point(172, 183), 34, -1)];
      bothArms(-15 + p * 45, -40 + p * 90);
      cue = 'Pull down with the clinch; drive the knee up through your hips'; break;
    }
    case 'shadowbox': case 'heavybag': {
      const s = Math.sin(time * Math.PI * 2);
      hip = point(178, 117 + Math.abs(s) * 2); shoulder = polar(hip, 58, -84);
      legs = [reach(hip, point(204, 183), 34, -1), reach(hip, point(156, 183), 34, -1)];
      const punch = (x: number) => limb(shoulder, 70 - x * 72, -100 + x * 98, 28);
      arms = [punch(Math.max(0, s)), punch(Math.max(0, -s))];
      if (kind === 'heavybag') equipment = 'bag';
      cue = kind === 'heavybag' ? 'Jab, cross: turn the hips into each punch, then hands back to guard' : 'Light on your feet; jab, cross and return to guard'; break;
    }
    case 'jumprope': {
      const h = Math.abs(Math.sin(time * Math.PI * 2)) * 9, turn = Math.sin(time * Math.PI * 4) * 25;
      hip = point(180, 115 - h); shoulder = point(180, 57 - h);
      legs = [limb(hip, 86, 94), limb(hip, 94, 86)];
      arms = [limb(shoulder, 100, 10 + turn, 28), limb(shoulder, 80, 10 + turn, 28)];
      cue = 'Small, quick hops on the balls of your feet; turn the rope from your wrists'; break;
    }
    case 'bound': {
      const s = Math.sin(time * Math.PI * 1.5);
      hip = point(180, 108 - Math.abs(s) * 10); shoulder = polar(hip, 58, -80);
      const leg = (x: number) => { const thigh = 90 - 55 * x; return limb(hip, thigh, thigh * .5 + 60); };
      legs = [leg(s), leg(-s)];
      arms = [limb(shoulder, 90 - s * 50, -s * 50, 28), limb(shoulder, 90 + s * 50, s * 50, 28)];
      cue = 'Long, springy strides; push off hard and drive the knee forward'; break;
    }
    case 'bunnyhop': {
      const air = Math.sin(((time * 1.25) % 1) * Math.PI);
      hip = point(180, 132 - air * 22); shoulder = polar(hip, 58, -70 - air * 15);
      const footY = 183 - air * 14;
      legs = [reach(hip, point(188, footY), 34, -1), reach(hip, point(178, footY), 34, -1)];
      bothArms(140 - air * 160, 120 - air * 140);
      cue = 'Feet together; quick, springy hops with soft landings'; break;
    }
    case 'run': case 'bike': case 'ladder': case 'conedribble': {
      const speed = kind === 'ladder' ? 4 : kind === 'conedribble' ? 1.4 : 2, swing = kind === 'ladder' ? .6 : 1;
      const s = Math.sin(time * Math.PI * speed);
      if (kind === 'ladder' || kind === 'conedribble') shoulder = polar(hip, 58, -82);
      legs = [limb(hip, 90 + s * 40 * swing, 90 - s * 50 * swing), limb(hip, 90 - s * 40 * swing, 90 + s * 50 * swing)];
      arms = [limb(shoulder, 90 - s * 35, -s * 35, 28), limb(shoulder, 90 + s * 35, s * 35, 28)];
      if (kind === 'bike') { shoulder = point(205, 65); bothArms(30, 60); }
      if (kind === 'ladder') equipment = 'ladder';
      if (kind === 'conedribble') { equipment = 'cones'; prop = { kind: 'ball', at: point(226 + Math.sin(time * Math.PI * 2.8) * 6, 177) }; }
      cue = kind === 'bike' ? 'Alternate smooth pedal strokes' : kind === 'ladder' ? 'Quick, light feet: one step in each box' : kind === 'conedribble' ? 'Small touches; keep the ball close as you weave the cones' : 'Opposite arm and leg move together'; break;
    }
    case 'versa': {
      const u = (1 + Math.sin(time * Math.PI * 1.6)) / 2, v = 1 - u;
      hip = point(176, 112); shoulder = polar(hip, 58, -84);
      legs = [limb(hip, 90 - 70 * u, 90 + 10 * u), limb(hip, 90 - 70 * v, 90 + 10 * v)];
      arms = [limb(shoulder, lerp(20, -60, v), lerp(-60, -75, v), 28), limb(shoulder, lerp(20, -60, u), lerp(-60, -75, u), 28)];
      equipment = 'climber'; cue = 'Climb steadily: opposite arm reaches as each knee drives up'; break;
    }
    case 'slide': case 'bandwalk': {
      const cx = 180 + 28 * Math.sin(time * Math.PI / 2), wide = (1 - Math.cos(time * Math.PI * 2)) / 2;
      const low = kind === 'slide', w = (low ? 18 : 12) + wide * (low ? 16 : 12);
      hip = point(cx, low ? 132 : 122); shoulder = point(cx, hip.y - 58);
      legs = [reach(hip, point(cx - w, 183), 34, 1), reach(hip, point(cx + w, 183), 34, -1)];
      arms = low ? [limb(shoulder, 150, 120, 28), limb(shoulder, 30, 60, 28)] : [limb(shoulder, 120, 30, 28), limb(shoulder, 60, 150, 28)];
      cue = low ? 'Stay low; push off the trail leg and never cross your feet' : 'Band above the knees; small side steps with tension the whole way'; break;
    }
    case 'splitstep': {
      const air = Math.sin(Math.min(1, ((time * .8) % 1) * 2) * Math.PI);
      hip = point(180, 125 - air * 12); shoulder = point(180, hip.y - 58);
      const w = 26 - air * 14, footY = 183 - air * 10;
      legs = [reach(hip, point(180 - w, footY), 34, 1), reach(hip, point(180 + w, footY), 34, -1)];
      arms = [limb(shoulder, 120, -10, 28), limb(shoulder, 60, -170, 28)];
      cue = 'Small hop as the ball is struck; land wide and ready to move'; break;
    }
    case 'chop': {
      hip = point(178, 117 + p * 8); shoulder = polar(hip, 58, -98 + 30 * p);
      legs = [reach(hip, point(198, 183), 34, -1), reach(hip, point(158, 183), 34, -1)];
      bothArms(-135 + 195 * p);
      cue = 'Arms long; rotate from high behind you to low in front, then return slowly'; break;
    }
    case 'landmine': {
      hip = point(176, 118); shoulder = polar(hip, 58, -80 + 8 * p);
      legs = [reach(hip, point(198, 183), 34, -1), reach(hip, point(156, 183), 34, -1)];
      arms = [limb(shoulder, 100, 80, 28), limb(shoulder, lerp(80, -40, p), lerp(-110, -40, p), 28)];
      equipment = 'weights'; cue = 'Pivot the back foot and turn your hips as you press up and across'; break;
    }
    case 'sled': {
      hip = point(170, 122); shoulder = polar(hip, 58, -35);
      arms = [reach(shoulder, point(262, 108), 28, 1), reach(shoulder, point(262, 108), 28, 1)];
      const a = (1 - Math.cos(time * Math.PI * 1.6)) / 2;
      legs = [reach(hip, point(150 + 50 * a, 183 - Math.sin(a * Math.PI) * 6), 34, -1), reach(hip, point(200 - 50 * a, 183 - Math.sin((1 - a) * Math.PI) * 6), 34, -1)];
      equipment = 'sled'; cue = 'Lean in with straight arms; drive with short, powerful steps'; break;
    }
    case 'dribble': {
      hip = point(176, 128); shoulder = polar(hip, 58, -68);
      legs = [reach(hip, point(200, 183), 34, -1), reach(hip, point(160, 183), 34, -1)];
      const bounce = Math.abs(Math.sin(time * Math.PI * 1.5)), pump = 1 - bounce;
      arms = [limb(shoulder, 70 + 15 * pump, 70 + 25 * pump, 28), limb(shoulder, 100, 30, 28)];
      const hand = arms[0][2];
      prop = { kind: 'ball', at: point(hand.x + 2, lerp(hand.y + 7, 177, bounce)) };
      cue = 'Eyes up; pound the ball with your fingertips and stay low'; break;
    }
    // ── Multi-step movements, blended between key poses ──
    case 'boxjump':
      return play([
        standing(),
        figure(point(168, 140), 40, [point(190, 183), point(180, 183)], [150, 160]),
        figure(point(205, 86), 15, (h) => [limb(h, 40, 120), limb(h, 55, 130)], [-60, -40]),
        figure(point(228, 118), 30, [point(244, 152), point(232, 152)], [20, 0]),
        figure(point(236, 86), 0, [point(242, 152), point(232, 152)], [95, 95]),
        figure(point(204, 104), 0, [point(236, 152), point(190, 183)], [95, 95]),
      ], 4.8, ['Stand tall facing the box', 'Load your hips and swing your arms back', 'Jump and drive your knees up', 'Land softly in a quarter squat', 'Stand tall on the box', 'Step down, one foot at a time'], 'box');
    case 'broadjump':
      return play([
        standing(150),
        figure(point(140, 140), 40, [point(160, 183), point(150, 183)], [150, 160]),
        figure(point(175, 108), 35, (h) => [limb(h, 120, 120), limb(h, 110, 115)], [-40, -30]),
        figure(point(205, 98), 15, (h) => [limb(h, 30, 110), limb(h, 40, 120)], [-20, 0]),
        figure(point(222, 140), 35, [point(240, 183), point(230, 183)], [20, 10]),
        standing(230),
      ], 4.2, ['Feet hip-width apart', 'Swing your arms back and load your hips', 'Explode forward with your arms', 'Tuck your knees', 'Land softly with bent knees', 'Stand, then walk back to reset']);
    case 'jumpsquat':
      return play([
        standing(),
        figure(point(160, 145), 25, [point(192, 183), point(170, 183)], [20, 10]),
        figure(point(182, 96), 0, [point(186, 164), point(176, 164)], [-95, -90]),
        figure(point(162, 142), 25, [point(192, 183), point(170, 183)], [20, 10]),
      ], 3.2, ['Stand tall', 'Squat down', 'Explode up, arms overhead', 'Land softly back into the squat']);
    case 'burpee': {
      const plank = mirror(poseOf(build('plank', 0)));
      const crouch = figure(point(165, 150), 70, [point(185, 183), point(175, 183)], (s) => [reach(s, point(228, 183), 28, 1), reach(s, point(228, 183), 28, 1)]);
      return play([
        standing(), crouch, plank, crouch,
        figure(point(182, 96), 0, [point(186, 164), point(176, 164)], [-95, -90]),
      ], 5, ['Stand tall', 'Squat and plant your hands', 'Jump your feet back to a plank', 'Jump your feet back in', 'Explode up, arms overhead']);
    }
    case 'clean': case 'cleanpress': {
      const feet: [Point, Point] = [point(186, 183), point(176, 183)];
      const setup = figure(point(160, 138), 50, feet, [85, 90]);
      const rack = figure(point(180, 115), 0, feet, [15, -110]);
      const frames = [
        setup,
        figure(point(180, 108), -5, [point(188, 176), point(178, 176)], [92, 92]),
        figure(point(172, 130), 15, [point(192, 183), point(176, 183)], [15, -110]),
        rack,
        ...(kind === 'cleanpress' ? [figure(point(178, 124), 5, [point(190, 183), point(176, 183)], [15, -110]), figure(point(180, 114), 0, feet, [-88, -90]), rack] : []),
        figure(point(180, 115), 0, feet, [92, 92]),
      ];
      const cues = ['Hips back, chest up, bar against your shins', 'Jump: extend hips, knees and ankles together', 'Pull under and catch in a quarter squat', 'Stand tall with the bar on your shoulders',
        ...(kind === 'cleanpress' ? ['Dip through the knees', 'Drive the bar overhead', 'Lower back to your shoulders'] : []), 'Lower the bar with control'];
      return play(frames, kind === 'cleanpress' ? 6 : 4, cues, 'weights');
    }
    case 'start3':
      return play([
        figure(point(172, 140), 80, [point(200, 183), point(150, 183)], (s) => [reach(s, point(238, 183), 28, 1), limb(s, 160, 150, 28)]),
        figure(point(190, 118), 45, (h) => [limb(h, 30, 100), reach(h, point(165, 183), 34, -1)], [-30, -60, 140, 120]),
        figure(point(208, 114), 35, (h) => [reach(h, point(195, 183), 34, -1), limb(h, 30, 100)], [140, 120, -30, -60]),
      ], 3.2, ['Set: one hand down, hips just above shoulders', 'Explode out low, driving the back knee', 'Stay low for the first strides']);
    case 'forehand': case 'backhand': {
      const stance: [Point, Point] = [point(200, 183), point(158, 183)], h = point(178, 120);
      const frames = [
        figure(h, -8, stance, [150, 175, 0, -10]),
        figure(h, 5, stance, [60, 0, 60, 40]),
        figure(h, 10, stance, [-60, -150, 100, 120]),
      ].map((pose) => ({ ...pose, held: 'racket' as const }));
      return play(kind === 'forehand' ? frames : frames.map(mirror), 2.6, kind === 'forehand'
        ? ['Turn your shoulders; racket back', 'Swing low to high; contact out in front', 'Follow through over your shoulder']
        : ['Turn your back shoulder; racket back', 'Swing through; contact out in front', 'Finish high and balanced']);
    }
    case 'serve': {
      const stance: [Point, Point] = [point(196, 183), point(162, 183)], h = point(178, 116);
      const ready = figure(h, 0, stance, [95, 60, 70, 20]);
      const trophy = figure(h, -10, stance, [175, -80, -80, -85]);
      const contact = figure(h, 12, stance, [-75, -75, 70, 90]);
      return play([
        { ...ready, held: 'racket' as const, prop: { kind: 'ball', at: ready.arms[1][2] } },
        { ...trophy, held: 'racket' as const, prop: { kind: 'ball', at: point(200, 8) } },
        { ...contact, held: 'racket' as const, prop: { kind: 'ball', at: point(contact.arms[0][2].x + 10, contact.arms[0][2].y - 20) } },
        { ...figure(h, 25, stance, [60, 120, 110, 100]), held: 'racket' as const },
      ], 3.2, ['Racket down, ball in your other hand', 'Toss up; racket back into the trophy position', 'Reach up and hit at full extension', 'Follow through across your body']);
    }
    case 'shoot': {
      const stance: [Point, Point] = [point(188, 183), point(172, 183)];
      const set = figure(point(178, 128), 5, stance, [60, -100, 70, -95]);
      const rise = figure(point(180, 113), 0, stance, [-60, -85, -50, -80]);
      const release = figure(point(180, 108), 0, [point(188, 178), point(172, 178)], [-70, -40, -55, -70]);
      return play([withBall(set), withBall(rise), { ...release, prop: { kind: 'ball', at: point(250, 10) } }, release], 2.8,
        ['Ball in your shooting pocket; knees bent', 'Rise and bring the ball up', 'Snap your wrist and release at the top', 'Hold the follow-through']);
    }
    case 'pass': {
      const plant = ([thigh, shin]: [number, number]) => (h: Point): [Limb, Limb] => [reach(h, point(200, 183), 34, -1), limb(h, thigh, shin)];
      const ready = figure(point(185, 117), 0, plant([95, 100]), [100, 80, 80, 100]);
      return play([
        { ...ready, prop: { kind: 'ball', at: point(222, 177) } },
        { ...figure(point(185, 117), -5, plant([140, 150]), [70, 60, 120, 130]), prop: { kind: 'ball', at: point(222, 177) } },
        { ...figure(point(188, 117), 5, plant([55, 70]), [110, 100, 70, 60]), prop: { kind: 'ball', at: point(232, 177) } },
        { ...ready, prop: { kind: 'ball', at: point(304, 177) } },
        { ...ready, prop: { kind: 'ball', at: point(224, 177) } },
      ], 2.4, ['Plant beside the ball', 'Swing the kicking leg back', 'Strike with the inside of your foot', 'Watch it hit the wall', 'Cushion the return'], 'wall');
    }
    case 'chestpass': case 'rotthrow': {
      const stance: [Point, Point] = [point(198, 183), point(160, 183)], h = point(178, 117);
      const chest = withBall(figure(h, 0, stance, [70, -110]), 'medball', 0, 0);
      const load = withBall(figure(h, -5, stance, [140, 160]), 'medball', 0, 0);
      const out = withBall(figure(h, 10, stance, kind === 'chestpass' ? [-5, -5] : [-10, -15]), 'medball', 0, 0);
      const wall = { ...out, prop: { kind: 'medball' as const, at: point(300, kind === 'chestpass' ? 80 : 95) } };
      return kind === 'chestpass'
        ? play([chest, out, wall], 2.4, ['Ball at your chest', 'Step and push the ball out hard', 'Catch the rebound at your chest'], 'wall')
        : play([load, out, wall, chest], 2.8, ['Rotate the ball back past your hip', 'Pivot and throw through your hips', 'Hard into the wall', 'Catch and reset'], 'wall');
    }
    case 'slam': {
      const top = withBall(figure(point(180, 110), -5, [point(186, 178), point(176, 178)], [-95, -95]), 'medball', 0, -4);
      const slam = { ...figure(point(160, 138), 60, [point(190, 183), point(178, 183)], [80, 85]), prop: { kind: 'medball' as const, at: point(218, 175) } };
      const pick = withBall(figure(point(160, 148), 45, [point(192, 183), point(176, 183)], [70, 80]), 'medball', 0, 0);
      const chest = withBall(figure(point(178, 118), 5, [point(186, 183), point(176, 183)], [60, -100]), 'medball', 0, 0);
      return play([top, slam, pick, chest], 2.6, ['Ball overhead, up on your toes', 'Slam it down hard, hinging at the hips', 'Squat to pick it up', 'Bring it back to your chest']);
    }
    case 'dance': {
      const s = Math.sin(time * Math.PI), cx = 180 + s * 18;
      hip = point(cx, 117 - Math.abs(Math.cos(time * Math.PI)) * 4); shoulder = point(cx, hip.y - 58);
      legs = [reach(hip, point(cx - 18 - Math.max(0, -s) * 14, 183), 34, 1), reach(hip, point(cx + 18 + Math.max(0, s) * 14, 183), 34, -1)];
      const up0 = Math.max(0, s), up1 = Math.max(0, -s);
      arms = [limb(shoulder, 120 + 110 * up0, 140 + 110 * up0, 28), limb(shoulder, 60 - 110 * up1, 40 - 110 * up1, 28)];
      cue = 'Step-touch side to side; let your arms swing with the beat'; break;
    }
    case 'legswing': {
      const s = Math.sin(time * Math.PI);
      legs = [limb(hip, 90 - s * 50, 90 - s * 50), reach(hip, point(176, 183), 34, -1)];
      arms = [limb(shoulder, -5, 0, 28), limb(shoulder, 95, 95, 28)];
      cue = 'Hold a support; swing the leg forward and back, relaxed'; break;
    }
    case 'armcircle': {
      const s = Math.sin(time * Math.PI * 1.5) * 22;
      legs = [reach(hip, point(166, 183), 34, 1), reach(hip, point(194, 183), 34, -1)];
      arms = [limb(shoulder, 180 + s, 180 + s, 28), limb(shoulder, -s, -s, 28)];
      cue = 'Arms out wide; draw small circles, then reverse'; break;
    }
    case 'foamroll': {
      const s = Math.sin(time * Math.PI / 1.5);
      hip = point(190 + s * 18, 160); shoulder = polar(hip, 58, 205);
      arms = [reach(shoulder, point(hip.x - 80, 184), 28, 1), reach(shoulder, point(hip.x - 80, 184), 28, 1)];
      legs = [limb(hip, 8, 8), limb(hip, 12, 12)];
      equipment = 'roller'; cue = 'Roll slowly along the muscle; pause on tight spots'; break;
    }
    case 'yoga': {
      const plank = poseOf(build('plank', 0));
      const cobraHip = point(210, 176), cobraShoulder = polar(cobraHip, 58, 205);
      const cobra: Pose = { hip: cobraHip, shoulder: cobraShoulder, legs: [reach(cobraHip, point(268, 184), 34, -1), reach(cobraHip, point(268, 184), 34, -1)], arms: [reach(cobraShoulder, point(160, 184), 28, -1), reach(cobraShoulder, point(160, 184), 28, -1)] };
      const dogHip = point(230, 128), dogShoulder = polar(dogHip, 58, 148);
      const dog: Pose = { hip: dogHip, shoulder: dogShoulder, legs: [reach(dogHip, point(268, 184), 34, -1), reach(dogHip, point(268, 184), 34, -1)], arms: [reach(dogShoulder, point(140, 184), 28, -1), reach(dogShoulder, point(140, 184), 28, -1)] };
      return play([plank, cobra, dog], 7.5, ['Plank: one long line', 'Lower and lift into cobra', 'Press back into downward dog'], 'mat');
    }
    case 'stretch': {
      const feet: [Point, Point] = [point(186, 183), point(176, 183)];
      return play([
        figure(point(180, 113), 0, feet, [-92, -92, -88, -88]),
        figure(point(170, 115), 100, feet, [92, 92]),
        figure(point(180, 115), 0, (h) => [reach(h, point(176, 183), 34, -1), limb(h, 95, -115)], (s) => [limb(s, 95, 95, 28), reach(s, polar(polar(point(180, 115), 34, 95), 34, -115), 28, 1)]),
      ], 6, ['Reach tall overhead', 'Fold forward from the hips; soft knees', 'Quad stretch: heel toward your glutes'], 'mat');
    }
    // ── Swimming: side view at the water surface, head to the right ──
    case 'freestyle': case 'backstroke': case 'butterfly': case 'kickboard': {
      equipment = 'pool';
      const wave = Math.sin(time * Math.PI * 1.6);
      hip = point(150, 104 + (kind === 'butterfly' ? -wave * 6 : 0));
      shoulder = polar(hip, 58, kind === 'backstroke' ? -6 : kind === 'butterfly' ? wave * 12 : 0);
      const turn = (offset: number, speed: number) => (((time * speed * 360 + offset) % 360) + 360) % 360;
      const pull = (deg: number) => limb(shoulder, deg, deg + (deg > 10 && deg < 170 ? 25 : 0), 28);
      if (kind === 'freestyle') arms = [pull(turn(0, .6)), pull(turn(180, .6))];
      if (kind === 'backstroke') arms = [limb(shoulder, turn(0, .45), turn(0, .45), 28), limb(shoulder, turn(180, .45), turn(180, .45), 28)];
      if (kind === 'butterfly') arms = [pull(turn(0, .8)), pull(turn(0, .8))];
      if (kind === 'kickboard') { arms = [limb(shoulder, 0, 0, 28), limb(shoulder, 0, 0, 28)]; prop = { kind: 'board', at: point(shoulder.x + 62, shoulder.y) }; }
      if (kind === 'butterfly') { const d = Math.sin(time * Math.PI * 1.6 + 3) * 18; legs = [limb(hip, 180 + d, 180 + d * 1.4), limb(hip, 180 + d, 180 + d * 1.4)]; }
      else { const k = Math.sin(time * Math.PI * 6) * (kind === 'kickboard' ? 1.4 : 1); legs = [limb(hip, 180 + k * 12, 180 + k * 18), limb(hip, 180 - k * 12, 180 - k * 18)]; }
      cue = kind === 'freestyle' ? 'Long reach, pull under your body, and kick from the hips; breathe to the side'
        : kind === 'backstroke' ? 'Hips high, straight-arm recovery over the water, steady flutter kick'
        : kind === 'butterfly' ? 'Both arms together; ride the body wave with a two-beat dolphin kick'
        : 'Arms long on the board; small, fast kicks from the hips, not the knees';
      break;
    }
    case 'breaststroke': {
      const h0 = point(150, 106);
      const body = (torso: number, armAngles: [number, number], kick: [Limb, Limb] | null): Pose => {
        const s = polar(h0, 58, torso);
        return { hip: h0, shoulder: s, arms: [limb(s, armAngles[0], armAngles[1], 28), limb(s, armAngles[0] + 4, armAngles[1] + 4, 28)], legs: kick ?? [limb(h0, 180, 180), limb(h0, 182, 182)] };
      };
      return play([
        body(0, [0, 0], null),
        body(-10, [40, 120], null),
        body(-14, [70, -10], [limb(h0, 160, 15), limb(h0, 164, 18)]),
        body(0, [0, 0], [limb(h0, 172, 160), limb(h0, 176, 164)]),
      ], 3.2, ['Glide long and flat', 'Pull out and down, then in under your chest', 'Lift to breathe; heels draw up toward your hips', 'Kick your heels round and back, arms shoot forward'], 'pool');
    }
    case 'streamline': {
      const c = (time / 3) % 1, d = Math.sin(time * Math.PI * 3) * 8;
      hip = point(110 + 100 * ease(c), 140); shoulder = polar(hip, 58, 0);
      arms = [limb(shoulder, 0, 0, 28), limb(shoulder, 0, 0, 28)];
      legs = [limb(hip, 180 + d, 180 + d * 1.5), limb(hip, 180 + d, 180 + d * 1.5)];
      equipment = 'pool'; cue = 'Push off the wall in a tight streamline: arms locked over your ears, small dolphin kicks'; break;
    }
    case 'flutter': {
      supine(); shoulder = point(132, 160);
      const k = Math.sin(time * Math.PI * 3) * 8;
      legs = [limb(hip, -12 + k, -12 + k), limb(hip, -12 - k, -12 - k)];
      bothArms(8, 0);
      cue = 'Low back pressed into the mat; small, fast kicks from the hips'; break;
    }
    case 'streamlinejump': {
      const feet: [Point, Point] = [point(186, 183), point(176, 183)];
      return play([
        figure(point(180, 115), 0, feet, [-90, -90]),
        figure(point(160, 145), 25, [point(192, 183), point(170, 183)], [-68, -68]),
        figure(point(182, 96), 0, [point(186, 164), point(176, 164)], [-90, -90]),
        figure(point(162, 142), 25, [point(192, 183), point(170, 183)], [-68, -68]),
      ], 3.2, ['Arms locked in a streamline over your ears', 'Squat, keeping the streamline', 'Explode up like a start off the blocks', 'Land softly and reset']);
    }
    // ── Baseball ──
    case 'bat': {
      const stance = figure(point(176, 117), -5, [point(196, 183), point(158, 183)], [100, -100]);
      const tee = { kind: 'ball' as const, at: point(268, 98) };
      return play([
        { ...stance, held: 'bat' as const, prop: tee },
        { ...figure(point(172, 118), -10, [point(204, 183), point(156, 183)], [120, -120]), held: 'bat' as const, prop: tee },
        { ...figure(point(182, 120), 10, [point(206, 183), point(160, 183)], [60, 10]), held: 'bat' as const, prop: tee },
        { ...figure(point(184, 118), 15, [point(206, 183), point(170, 183)], [-60, -170]), held: 'bat' as const, prop: { kind: 'ball', at: point(350, 30) } },
        { ...stance, held: 'bat' as const },
      ], 3.4, ['Balanced stance, hands by your back shoulder', 'Load back and take a short stride', 'Turn your hips and drive the barrel through the ball', 'Finish high over your front shoulder', 'Reset for the next ball'], 'tee');
    }
    case 'throw': case 'qbthrow': {
      const ball = kind === 'qbthrow' ? 'football' : 'ball';
      const set = figure(point(178, 117), 0, [point(192, 183), point(164, 183)], [100, 80, 60, 30]);
      const cock = figure(point(172, 118), -12, [point(212, 183), point(158, 183)], [175, -95, -10, -20]);
      const release = figure(point(190, 118), 20, [point(214, 183), point(166, 183)], [-30, -10, 80, 120]);
      const follow = figure(point(196, 122), 40, (h) => [reach(h, point(214, 183), 34, -1), limb(h, 150, 120)], [70, 110, 110, 90]);
      return play([withBall(set, ball, 0, 0), withBall(cock, ball, 0, 0), withBall(release, ball, 0, 0), { ...follow, prop: { kind: ball, at: point(345, 70) } }, set],
        3, kind === 'qbthrow'
          ? ['Ball high at your chest; eyes downfield', 'Step to your target; ball up by your ear', 'Hips, then shoulder; spin it off your fingertips', 'Follow through, thumb down across your body', 'Reset your feet']
          : ['Glove and ball together; line up with your target', 'Step toward the target; ball up into the high-cocked position', 'Hips first, then shoulder; release out in front', 'Follow through across your body', 'Get a new ball and reset']);
    }
    case 'field': {
      const ready = figure(point(176, 126), 20, [point(200, 183), point(156, 183)], [80, 40, 80, 40]);
      return play([
        ready,
        { ...ready, prop: { kind: 'ball', at: point(340, 177) } },
        { ...figure(point(170, 148), 60, [point(206, 183), point(150, 183)], (s) => [reach(s, point(232, 180), 28, 1), reach(s, point(228, 176), 28, 1)]), prop: { kind: 'ball', at: point(232, 177) } },
        withBall(figure(point(176, 124), 15, [point(204, 183), point(158, 183)], [60, -100, 70, -90]), 'ball', 0, 0),
        { ...figure(point(186, 120), 25, [point(210, 183), point(166, 183)], [-20, -10, 100, 120]), prop: { kind: 'ball', at: point(345, 90) } },
      ], 3.6, ['Ready position: low, weight on the balls of your feet', 'Read the ball off the bat', 'Glove down in front; field it with two hands', 'Bring it to your chest as you rise', 'Quick feet and throw to first']);
    }
    // ── American football ──
    case 'proagility': {
      const run = figure(point(160, 118), 30, (h) => [limb(h, 40, 110), reach(h, point(140, 183), 34, -1)], [-30, -60, 140, 120]);
      const touch = figure(point(212, 148), 70, [point(240, 183), point(190, 183)], (s) => [reach(s, point(262, 183), 28, 1), limb(s, 160, 150, 28)]);
      return play([run, touch, mirror(run), mirror(touch)], 4, ['Explode out 5 yards', 'Plant low and touch the line', 'Turn and sprint 10 yards back', 'Touch the far line, then finish through the start']);
    }
    case 'backpedal': {
      const s = Math.sin(time * Math.PI * 3);
      hip = point(180, 126 - Math.abs(s) * 2); shoulder = polar(hip, 58, -75);
      legs = [limb(hip, 100 + s * 22, 70 + s * 10), limb(hip, 100 - s * 22, 70 - s * 10)];
      arms = [limb(shoulder, 90 - s * 30, -10 - s * 30, 28), limb(shoulder, 90 + s * 30, -10 + s * 30, 28)];
      cue = 'Stay low with your chest over your toes; quick steps back, then plant and break forward on the cue'; break;
    }
    case 'carry': {
      const s = Math.sin(time * Math.PI * 1.4);
      legs = [limb(hip, 90 + s * 18, 90 + Math.max(0, s) * 20), limb(hip, 90 - s * 18, 90 + Math.max(0, -s) * 20)];
      arms = [limb(shoulder, 92, 92, 28), limb(shoulder, 88, 88, 28)];
      equipment = 'weights'; cue = 'Heavy weights at your sides; stand tall, brace your core and walk with short, steady steps'; break;
    }
    case 'catch': case 'highcatch': {
      const ball = kind === 'highcatch' ? 'ball' : 'football';
      const feet: [Point, Point] = [point(196, 183), point(160, 183)];
      const ready = figure(point(176, 118), 10, feet, [70, -60]);
      const reachUp = figure(point(178, 116), 5, feet, [-40, -50, -30, -45]);
      return play([
        ready,
        { ...ready, prop: { kind: ball, at: point(352, 28) } },
        withBall(reachUp, ball, 0, -2),
        withBall(figure(point(176, 120), 10, feet, [60, -110, 70, -100]), ball, 0, 4),
        kind === 'highcatch' ? ready : withBall(figure(point(190, 116), 25, (h) => [limb(h, 40, 110), reach(h, point(170, 183), 34, -1)], [70, -110, 140, 120]), ball, 0, 4),
      ], 3.6, kind === 'highcatch'
        ? ['Ready: eyes on the ball', 'Track it in the air and get under it', 'Hands in a W above your eyes; catch it high', 'Pull it into your chest', 'Back to ready']
        : ['Eyes on the passer', 'Track the ball in the air', 'Hands up, thumbs together: catch it away from your body', 'Tuck it high and tight', 'Turn upfield']);
    }
    // ── Position drills ──
    case 'keeperdive': {
      const ready = figure(point(180, 126), 15, [point(202, 183), point(160, 183)], [50, -20, 60, -10]);
      const push = figure(point(196, 128), 40, [point(214, 183), point(174, 168)], [-25, -25, -15, -15]);
      const dive = figure(point(200, 150), 85, (h) => [limb(h, 178, 182), limb(h, 172, 178)], [-8, -8, 4, 2]);
      const land = figure(point(196, 172), 90, (h) => [limb(h, 176, 172), limb(h, 180, 176)], (s) => [reach(s, point(272, 174), 28, 1), reach(s, point(268, 177), 28, 1)]);
      const save = (pose: Pose, x: number, y: number): Pose => ({ ...pose, prop: { kind: 'ball', at: point(x, y) } });
      const side = [save(ready, 345, 120), save(push, 320, 136), withBall(dive, 'ball', 0, 0), withBall(land, 'ball', 0, -4), ready];
      return play([...side, ...side.map(mirror)], 6,
        ['Set: low, weight on the balls of your feet', 'Step and push off the near leg', 'Dive: both hands to the ball, eyes on it', 'Land on your side, ball pinned to the ground', 'Up quickly and set again',
          'Set again', 'Push off toward the other side', 'Dive: both hands to the ball', 'Land on your side and smother it', 'Back up and set']);
    }
    case 'header': {
      const crouch = figure(point(176, 140), 25, [point(192, 183), point(166, 183)], [110, 120, 100, 110]);
      const jump = figure(point(180, 100), -5, [point(186, 166), point(174, 168)], [-60, -40, -120, -150]);
      const hit = figure(point(182, 98), 15, [point(190, 168), point(176, 170)], [150, 120, 40, 60]);
      const head = polar(hit.shoulder, 22, -90 + 15);
      return play([
        { ...crouch, prop: { kind: 'ball', at: point(340, 40) } },
        { ...jump, prop: { kind: 'ball', at: point(260, 50) } },
        { ...hit, prop: { kind: 'ball', at: point(head.x + 12, head.y - 4) } },
        { ...figure(point(178, 120), 5, [point(192, 183), point(166, 183)], [100, 110, 80, 90]), prop: { kind: 'ball', at: point(345, 20) } },
      ], 3.2, ['Eyes on the ball; load your legs', 'Jump off both feet, arms up for height', 'Attack it with your forehead; eyes open, neck firm', 'Land softly on both feet']);
    }
    case 'shot': {
      const plant = ([thigh, shin]: [number, number]) => (h: Point): [Limb, Limb] => [reach(h, point(202, 183), 34, -1), limb(h, thigh, shin)];
      const approach = figure(point(178, 117), 5, plant([100, 110]), [120, 100, 60, 80]);
      return play([
        { ...approach, prop: { kind: 'ball', at: point(222, 177) } },
        { ...figure(point(182, 118), -8, plant([145, 170]), [40, 20, 150, 170]), prop: { kind: 'ball', at: point(222, 177) } },
        { ...figure(point(188, 118), 12, plant([50, 85]), [140, 160, 30, 10]), prop: { kind: 'ball', at: point(220, 177) } },
        { ...figure(point(192, 116), 18, plant([-15, -5]), [150, 170, 20, 0]), prop: { kind: 'ball', at: point(345, 60) } },
      ], 2.8, ['Plant beside the ball, eyes on it', 'Swing the kicking leg back', 'Strike through the middle with your laces, toe down', 'Follow through toward the target']);
    }
    case 'block': {
      const stance = figure(point(176, 150), 20, [point(204, 183), point(150, 183)], [30, -10, 80, 60]);
      const knees = figure(point(176, 149), 25, (h) => [limb(h, 92, 180), limb(h, 88, 182)], (s) => [reach(s, point(206, 178), 28, 1), reach(s, point(200, 180), 28, 1)]);
      return play([
        stance,
        { ...stance, prop: { kind: 'ball', at: point(340, 150) } },
        { ...knees, prop: { kind: 'ball', at: point(212, 177) } },
        withBall(figure(point(176, 150), 20, [point(204, 183), point(150, 183)], [60, -100, 70, -90]), 'ball', 0, 0),
      ], 3.4, ['Catcher’s stance: glove out front', 'Ball in the dirt: read it early', 'Drop to your knees: glove between your legs, chin down, chest over the ball', 'Pop back up and find the ball']);
    }
    case 'volley': {
      const ready: Pose = { ...figure(point(180, 122), 5, [point(200, 183), point(160, 183)], [60, -30, 80, -20]), held: 'racket' };
      const punch: Pose = { ...figure(point(190, 124), 12, [point(220, 183), point(166, 183)], [-10, -40, 100, 60]), held: 'racket' };
      const high: Pose = { ...figure(point(186, 118), 5, [point(208, 183), point(166, 183)], [-60, -75, 70, 40]), held: 'racket' };
      return play([
        ready,
        { ...punch, prop: { kind: 'ball', at: point(punch.arms[0][2].x + 18, punch.arms[0][2].y - 4) } },
        ready,
        { ...high, prop: { kind: 'ball', at: point(high.arms[0][2].x + 14, high.arms[0][2].y - 16) } },
      ], 3.2, ['Ready at the net: racket up in front', 'Step in and punch the volley out front; no backswing', 'Recover to ready', 'High volley: reach up and punch it down']);
    }
    case 'hurdle': {
      const stride = figure(point(140, 116), 15, (h) => [limb(h, 40, 110), reach(h, point(122, 183), 34, -1)], [-30, -60, 140, 120]);
      const lead = figure(point(172, 108), 25, (h) => [limb(h, -5, 0), limb(h, 120, 150)], [-10, -20, 150, 140]);
      const over = figure(point(200, 104), 30, (h) => [limb(h, 5, 15), limb(h, 175, 95)], [-20, -20, 150, 160]);
      const down = figure(point(232, 116), 10, (h) => [reach(h, point(240, 183), 34, -1), limb(h, 40, 110)], [140, 120, -30, -60]);
      return play([stride, lead, over, down], 3.2, ['Run tall into the hurdle', 'Lead knee up, then extend the lead leg', 'Trail leg out to the side and over; chest stays forward', 'Snap the lead leg down and keep sprinting'], 'hurdle');
    }
    case 'shrimp': {
      const lie = (hipAt: Point, feet: [Point, Point], a: number[]): Pose => {
        const s = point(127, 172);
        return { hip: hipAt, shoulder: s, legs: [reach(hipAt, feet[0], 34, -1), reach(hipAt, feet[1], 34, -1)], arms: [limb(s, a[0], a[1], 28), limb(s, a[2], a[3], 28)] };
      };
      return play([
        lie(point(185, 172), [point(226, 183), point(226, 183)], [-60, -10, -50, 0]),
        lie(point(188, 154), [point(228, 183), point(226, 183)], [-40, 0, -30, 10]),
        lie(point(206, 172), [point(232, 176), point(222, 183)], [-10, 0, 0, 5]),
      ], 3, ['On your back, knees bent, frame up with your arms', 'Bridge up onto one shoulder', 'Push your hips away and shrimp back; arms push the frame'], 'mat');
    }
    case 'sprawl': {
      const stance = figure(point(178, 134), 35, [point(204, 183), point(152, 183)], [60, 10, 70, 20]);
      const plank = mirror(poseOf(build('plank', 0)));
      const hipDown = point(plank.hip.x, plank.hip.y + 6);
      const down: Pose = { ...plank, hip: hipDown, legs: [reach(hipDown, plank.legs[0][2], 34, -1), reach(hipDown, plank.legs[1][2], 34, -1)] };
      return play([stance, figure(point(172, 150), 60, [point(196, 183), point(178, 183)], (s) => [reach(s, point(232, 183), 28, 1), reach(s, point(228, 183), 28, 1)]), down, stance],
        2.6, ['Wrestling stance: low, hands ready', 'Hands down as they shoot', 'Sprawl: kick your legs back and drop your hips to the floor', 'Snap back up to your stance']);
    }
    case 'rebound': {
      const boxOut = figure(point(176, 136), 20, [point(202, 183), point(150, 183)], [30, 0, 150, 180]);
      const top = figure(point(180, 96), 0, [point(186, 164), point(176, 166)], [-80, -90, -98, -90]);
      return play([
        { ...boxOut, prop: { kind: 'ball', at: point(320, 20) } },
        { ...top, prop: { kind: 'ball', at: point(top.arms[0][2].x, top.arms[0][2].y - 8) } },
        withBall(figure(point(178, 128), 10, [point(196, 183), point(160, 183)], [60, -110, 70, -100]), 'ball', 0, 8),
      ], 2.8, ['Box out: low, wide and find your player', 'Jump and grab it at the top with both hands', 'Land strong; ball at your chin, elbows out']);
    }
    // ── Calisthenics ──
    case 'pistol': {
      hip = point(180 - p * 24, 115 + p * 45); shoulder = polar(hip, 58, -90 + p * 35);
      legs = [reach(hip, point(182, 183), 34, -1), limb(hip, 60 - p * 62, 60 - p * 62)];
      bothArms(lerp(55, -5, p));
      cue = 'Sit down on one leg while the other reaches forward; stand up without touching down'; break;
    }
    case 'lsit': {
      hip = point(170, 156 - p * 3); shoulder = polar(hip, 58, -88);
      arms = [reach(shoulder, point(176, 152), 28, 1), reach(shoulder, point(180, 152), 28, 1)];
      legs = [limb(hip, -2 - p * 4, -2 - p * 4), limb(hip, 0 - p * 4, 0 - p * 4)];
      equipment = 'parallettes'; cue = 'Push down through straight arms; legs straight and level, toes pointed'; break;
    }
    case 'hollow': {
      supine(); shoulder = polar(hip, 58, 196);
      bothLegs(-14 - p * 4); bothArms(196);
      cue = 'Low back glued to the floor; arms and legs long, shoulders and feet just off the mat'; break;
    }
    case 'handstand': {
      equipment = 'wall';
      shoulder = point(294 + Math.sin(time * Math.PI) * .5, 127 - p * 3); hip = polar(shoulder, 58, -88);
      arms = [reach(shoulder, point(290, 183), 28, -1), reach(shoulder, point(296, 183), 28, -1)];
      legs = [limb(hip, -80, -80), limb(hip, -82, -82)];
      cue = 'Hands shoulder-width; push the floor away, ribs in, squeeze your glutes'; break;
    }
    case 'frontlever': {
      const hold = Math.sin(time * Math.PI) * 2;
      shoulder = point(162, 66 + hold); hip = polar(shoulder, 58, 2);
      arms = [reach(shoulder, point(176, 15), 28, 1), reach(shoulder, point(184, 15), 28, 1)];
      legs = [limb(hip, 205 - p * 35, 100 - p * 20), limb(hip, 208 - p * 35, 102 - p * 20)];
      equipment = 'bar'; cue = 'Straight arms, pull the bar toward your hips; tuck tight and keep your back flat'; break;
    }
    case 'muscleup': {
      const grip = (s: Point): [Limb, Limb] => [reach(s, point(186, 32), 28, -1), reach(s, point(190, 32), 28, -1)];
      return play([
        figure(point(171, 80), -5, (h) => [limb(h, 100, 95), limb(h, 96, 92)], grip),
        figure(point(178, 108), -10, (h) => [limb(h, 105, 100), limb(h, 100, 96)], grip),
        figure(point(184, 144), 0, (h) => [limb(h, 115, 175), limb(h, 112, 172)], grip),
      ], 4.5, ['Start at the top, chest over the bar', 'Lower slowly through the transition', 'Finish in a controlled hang, then climb back up'], 'mubar');
    }
  }
  return { hip, shoulder, arms, legs, cue, equipment, prop };
}
