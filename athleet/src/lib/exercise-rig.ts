export type Point = { x: number; y: number };
export type Limb = [Point, Point, Point];
export type Equipment =
  | 'mat' | 'bench' | 'weights' | 'bar' | 'none'
  | 'box' | 'handbench' | 'bag' | 'sled' | 'ladder' | 'cones' | 'wall' | 'roller' | 'climber';
/** A ball or medicine ball moving with the exercise. */
export type Prop = { kind: 'ball' | 'medball'; at: Point };
/** `racket`: the first arm holds a racket. */
export type ExerciseRig = { hip: Point; shoulder: Point; arms: [Limb, Limb]; legs: [Limb, Limb]; cue: string; equipment: Equipment; prop?: Prop; racket?: boolean };
type Pose = { hip: Point; shoulder: Point; arms: [Limb, Limb]; legs: [Limb, Limb]; prop?: Prop; racket?: boolean };

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
    hip, shoulder, prop, index, racket: a.racket || b.racket,
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
const withBall = (pose: Pose, kind: 'ball' | 'medball' = 'ball', arm = 0, dy = -6): Pose => ({ ...pose, prop: { kind, at: point(pose.arms[arm][2].x, pose.arms[arm][2].y + dy) } });
function mirror(pose: Pose): Pose {
  const m = (p: Point) => point(360 - p.x, p.y);
  const ml = (l: Limb): Limb => [m(l[0]), m(l[1]), m(l[2])];
  return { hip: m(pose.hip), shoulder: m(pose.shoulder), arms: [ml(pose.arms[0]), ml(pose.arms[1])], legs: [ml(pose.legs[0]), ml(pose.legs[1])], prop: pose.prop && { ...pose.prop, at: m(pose.prop.at) }, racket: pose.racket };
}
const standing = (x = 180): Pose => figure(point(x, 115), 0, [point(x + 6, 183), point(x - 4, 183)], [95, 95, 85, 85]);
const poseOf = ({ hip, shoulder, arms, legs, prop, racket }: ExerciseRig): Pose => ({ hip, shoulder, arms, legs, prop, racket });

// ─── Name → movement ────────────────────────────────────────────────────────

const recipes = [
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
    return { hip: pose.hip, shoulder: pose.shoulder, arms: pose.arms, legs: pose.legs, prop: pose.prop, racket: pose.racket, equipment: gear, cue: cues[Math.min(pose.index, cues.length - 1)] };
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
      ].map((pose) => ({ ...pose, racket: true }));
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
        { ...ready, racket: true, prop: { kind: 'ball', at: ready.arms[1][2] } },
        { ...trophy, racket: true, prop: { kind: 'ball', at: point(200, 8) } },
        { ...contact, racket: true, prop: { kind: 'ball', at: point(contact.arms[0][2].x + 10, contact.arms[0][2].y - 20) } },
        { ...figure(h, 25, stance, [60, 120, 110, 100]), racket: true },
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
  }
  return { hip, shoulder, arms, legs, cue, equipment, prop };
}
