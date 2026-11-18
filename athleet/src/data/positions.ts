import type { CoachProgram, DayTemplate, TemplateExercise } from './workouts';

// Positions (or events / playing styles) for the sport coaches. Picking one after the goal
// step reshapes the coach's week: the sport-skill day becomes a position day, exercises
// that don't suit the role are swapped, a few role-specific ones are added, and the
// meal plan's calories, recipe choice and tips follow the position's demands.

/** How the meal plan picks recipes: calorie-dense, lean and light, or carb-rich fuel. */
export type MealFocus = 'mass' | 'lean' | 'fuel';

export type Position = {
  id: string;
  label: string;
  icon: string;
  hint: string;
  /** Replaces the coach's sport-skill day (`PositionGroup.skillDay`). */
  day: DayTemplate;
  /** Exercise name -> replacement, on every other day of the coach's program. */
  swap?: Record<string, TemplateExercise>;
  /** Extra exercises for some of the coach's days (day key -> exercises). */
  add?: Record<string, TemplateExercise[]>;
  /** One line for "why this plan". */
  why: string;
  /** Calorie multiplier on top of the goal (e.g. 1.1 for linemen). */
  calories?: number;
  meals: MealFocus;
  nutritionTips: string[];
};

export type PositionGroup = {
  /** What the choice is called for this sport. */
  noun: 'position' | 'event' | 'style';
  question: string;
  /** The coach's prompt in the plan builder. */
  prompt: string;
  /** Key of the program day the position day replaces. */
  skillDay: string;
  positions: Position[];
};

/** Picked when the user doesn't have a position yet: the coach's normal plan. */
export const NO_POSITION = 'none';

const ARM_CARE: TemplateExercise = { name: 'Band external rotation', kind: 'accessory', reps: '15 each arm', notes: 'Arm care: every week' };
const SHORT_SPRINTS: TemplateExercise = { name: '10-yard sprints', kind: 'sprint', lowImpact: 'Bike sprint starts', reps: '6-8 reps', notes: 'Explode out of your stance' };
const BROAD_JUMP: TemplateExercise = { name: 'Broad jump', kind: 'power', lowImpact: 'Kettlebell swing', reps: '5' };
const BOX_JUMP: TemplateExercise = { name: 'Box jump', kind: 'power', lowImpact: 'Medicine ball chest pass', notes: 'Land soft, step down' };
const SLIDES = (reps = '6 x 20s', notes?: string): TemplateExercise => ({ name: 'Defensive slides', kind: 'skill', reps, notes });
const pool = (focus: string, exercises: TemplateExercise[]): DayTemplate => ({ focus, venue: 'pool', exercises });

export const POSITIONS: Record<string, PositionGroup> = {
  // ── American football ──
  blitz: {
    noun: 'position',
    question: 'What position do you play?',
    prompt: 'A quarterback and a lineman need very different weeks. What position do you play? I’ll build your training around it.',
    skillDay: 'football',
    positions: [
      {
        id: 'qb', label: 'Quarterback', icon: '🎯', hint: 'Footwork, accuracy and a healthy arm',
        day: { focus: 'Quarterback: footwork + throwing', exercises: [
          { name: 'Quarterback drop-backs (3, 5 and 7 step)', kind: 'skill', reps: '8 reps', notes: 'Quick feet, eyes downfield' },
          { name: 'Football throwing progression', kind: 'skill', reps: '15 min', notes: 'Short to long; stop if your arm hurts' },
          { name: 'Pocket movement drills', kind: 'skill', reps: '6 x 20s', notes: 'Slide, reset your feet, then throw' },
          { name: 'Medicine ball rotational throw', kind: 'power', reps: '8 each side' },
          ARM_CARE,
        ] },
        swap: { 'Bench press': { name: 'Dumbbell bench press', kind: 'main', easier: 'Push-up' } },
        add: { upper: [{ name: 'Cable rotational chop', kind: 'power', reps: '10 each side' }] },
        why: 'As a quarterback, you train drop-back footwork, throwing and rotational power, with arm care every week. Dumbbells replace heavy barbell pressing to protect your throwing shoulder.',
        meals: 'fuel',
        nutritionTips: ['Carbs before practice keep your decisions sharp late in the game', 'Fatty fish like salmon twice a week'],
      },
      {
        id: 'rb', label: 'Running back', icon: '🏃', hint: 'Burst, sharp cuts and leg drive through contact',
        day: { focus: 'Running back: burst + ball security', exercises: [
          { name: '3-point starts', kind: 'skill', reps: '6 x 10 yards', notes: 'Low first three steps' },
          { name: 'Cone cutting drills', kind: 'skill', reps: '6 reps', notes: 'Plant on the outside foot and cut hard' },
          { name: 'Catching drills', kind: 'skill', reps: '10 min', notes: 'Catch out of the backfield, then tuck' },
          { name: 'Ball-security sprints', kind: 'sprint', lowImpact: 'Bike sprints', reps: '6 x 20 yards', notes: 'Ball high and tight; cover the point' },
          { name: 'Sled push', kind: 'conditioning', lowImpact: 'Bike intervals', reps: '6 x 15m' },
        ] },
        add: { lower: [{ name: 'Lateral lunge', kind: 'accessory' }] },
        why: 'As a running back, you train your first step, sharp cuts, catching out of the backfield and leg drive through contact.',
        calories: 1.05,
        meals: 'fuel',
        nutritionTips: ['Carbs plus protein after practice to refuel your legs', 'A big breakfast on game day, 3-4 hours before kickoff'],
      },
      {
        id: 'wr', label: 'Wide receiver', icon: '🙌', hint: 'Top speed, crisp routes and reliable hands',
        day: { focus: 'Wide receiver: routes + hands', exercises: [
          { name: 'Route running (stem and break)', kind: 'skill', reps: '8 routes', notes: 'Sell the stem, then snap the break' },
          { name: 'Catching drills', kind: 'skill', reps: '15 min', notes: 'Hands catch away from your body' },
          { name: 'Flying sprints', kind: 'sprint', lowImpact: 'Bike sprints', reps: { beginner: '3 x 20m fly', intermediate: '4 x 30m fly', advanced: '6 x 30m fly' } },
          BOX_JUMP,
        ] },
        add: { lower: [{ name: 'Single-leg Romanian deadlift', kind: 'accessory', notes: 'Hamstring health for sprinting' }] },
        why: 'As a wide receiver, you train top speed, sharp routes and hands, with single-leg work to keep your hamstrings healthy.',
        meals: 'lean',
        nutritionTips: ['Light, carb-rich meals before speed days so you feel fast', 'Protein at every meal to stay strong without getting heavy'],
      },
      {
        id: 'ol', label: 'Offensive line', icon: '🧱', hint: 'Strength, pad level and pass sets',
        day: { focus: 'Offensive line: get-off + blocking', exercises: [
          { name: '3-point starts', kind: 'skill', reps: '8 x 5 yards', notes: 'Stance and get-off' },
          { name: 'Blocking sled drive', kind: 'skill', reps: '6 x 10 yards', notes: 'Low pad level, short powerful steps' },
          { name: 'Pass-set kick slides', kind: 'skill', reps: '6 x 5 yards', notes: 'Kick, slide, never cross your feet' },
          { name: 'Medicine ball chest pass', kind: 'power', reps: '8', notes: 'Punch it like your hands on a block' },
          { name: "Farmer's carry", kind: 'accessory', reps: '4 x 30m' },
        ] },
        swap: {
          '40-yard sprints': SHORT_SPRINTS,
          'Shuttle runs': { name: 'Sled push', kind: 'conditioning', lowImpact: 'Bike intervals', reps: '6 x 15m' },
        },
        add: { upper: [{ name: 'Inverted row', kind: 'accessory', easier: 'Band row' }] },
        why: 'As an offensive lineman, you train heavy strength, a fast first step and low pad level. Sprints stay short, because a play rarely asks you to run more than 10 yards.',
        calories: 1.12,
        meals: 'mass',
        nutritionTips: ['Eat 4-5 meals a day to hold your playing weight', 'Calorie-dense extras: whole milk, nut butter, rice and potatoes'],
      },
      {
        id: 'dl', label: 'Defensive line', icon: '🦍', hint: 'Explosive get-off and hand fighting',
        day: { focus: 'Defensive line: get-off + hands', exercises: [
          { name: '3-point starts', kind: 'skill', reps: '8 x 5 yards', notes: 'React to the ball, not the cadence' },
          { name: 'Hand-fighting drills', kind: 'skill', reps: '4 x 20s', notes: 'Fast hands: strike, swipe and rip' },
          { name: 'Blocking sled drive', kind: 'skill', reps: '6 x 10 yards' },
          { name: 'Medicine ball slam', kind: 'power', reps: '10' },
          { name: 'Pro agility shuttle (5-10-5)', kind: 'skill', lowImpact: 'Lateral band walk', reps: '4 reps' },
        ] },
        swap: { '40-yard sprints': SHORT_SPRINTS },
        add: { lower: [BROAD_JUMP] },
        why: 'As a defensive lineman, you train an explosive get-off, violent hands and heavy lower-body strength. Sprints stay short and sharp.',
        calories: 1.1,
        meals: 'mass',
        nutritionTips: ['Protein at every meal plus a shake to hold size', 'Rice, potatoes and oats fuel heavy lifting days'],
      },
      {
        id: 'lb', label: 'Linebacker', icon: '💥', hint: 'Read, react, cover and tackle',
        day: { focus: 'Linebacker: read, react + tackle', exercises: [
          { name: 'Backpedal and break', kind: 'skill', reps: '6 x 10 yards' },
          { name: 'Pro agility shuttle (5-10-5)', kind: 'skill', lowImpact: 'Lateral band walk', reps: '6 reps' },
          SLIDES('6 x 20s', 'Shuffle and fill the gap'),
          { name: 'Tackling form (sled drive)', kind: 'skill', reps: '6 x 5 yards', notes: 'Head up, wrap and drive through' },
          { name: 'Catching drills', kind: 'skill', reps: '10 min', notes: 'Drop into coverage, then break on the ball' },
        ] },
        add: { lower: [BROAD_JUMP] },
        why: 'As a linebacker, you train quick reads, change of direction, coverage drops and safe tackling form on top of full-body strength.',
        calories: 1.05,
        meals: 'fuel',
        nutritionTips: ['Carbs and protein in every meal on two-a-day weeks', 'Electrolytes on hot practice days'],
      },
      {
        id: 'db', label: 'Defensive back', icon: '🛡️', hint: 'Backpedal, fluid hips and ball skills',
        day: { focus: 'Defensive back: coverage + ball skills', exercises: [
          { name: 'Backpedal and break', kind: 'skill', reps: '8 x 10 yards' },
          { name: 'Hip turn drills', kind: 'skill', reps: '6 reps', notes: 'Open your hips and run without losing speed' },
          { name: 'Catching drills', kind: 'skill', reps: '10 min', notes: 'High-point the ball' },
          { name: 'Flying sprints', kind: 'sprint', lowImpact: 'Bike sprints', reps: { beginner: '3 x 20m fly', intermediate: '4 x 30m fly', advanced: '6 x 30m fly' } },
          BOX_JUMP,
        ] },
        why: 'As a defensive back, you train a smooth backpedal, quick hip turns, top speed and ball skills.',
        meals: 'lean',
        nutritionTips: ['Light meals before speed work so you stay quick', 'Fruit and yogurt make an easy post-practice snack'],
      },
    ],
  },

  // ── Basketball ──
  atlas: {
    noun: 'position',
    question: 'What position do you play?',
    prompt: 'Guards, wings and bigs win in different ways. What position do you play? I’ll shape your court days around it.',
    skillDay: 'court',
    positions: [
      {
        id: 'guard', label: 'Guard', icon: '🏀', hint: 'Handles, shooting and quickness',
        day: { focus: 'Guard: handles + shooting', exercises: [
          { name: 'Ball-handling series', kind: 'skill', reps: '15 min', notes: 'Two-ball dribbles, crossovers, between the legs' },
          { name: 'Form shooting', kind: 'skill', reps: '15 min', notes: 'Then pull-ups off the dribble' },
          SLIDES('6 x 30s', 'Pressure the ball'),
          { name: 'Court sprints (baseline to baseline)', kind: 'conditioning', lowImpact: 'Bike intervals', reps: { beginner: '6 reps', intermediate: '10 reps', advanced: '14 reps' } },
        ] },
        add: { lower: [{ name: 'Lateral lunge', kind: 'accessory' }] },
        why: 'As a guard, your court days focus on ball-handling, shooting off the dribble and quick defensive feet.',
        meals: 'lean',
        nutritionTips: ['Light meals before games so you stay quick', 'Carbs at lunch on game days'],
      },
      {
        id: 'wing', label: 'Wing / forward', icon: '🦅', hint: 'Shooting, slashing and defending',
        day: { focus: 'Wing: shooting + slashing', exercises: [
          { name: 'Form shooting', kind: 'skill', reps: '15 min', notes: 'Catch-and-shoot from the wings and corners' },
          { name: 'Ball-handling series', kind: 'skill', reps: '8 min', notes: 'Attack the rim off one or two dribbles' },
          { ...BOX_JUMP, notes: 'Finish strong at the rim' },
          SLIDES('6 x 30s'),
          { name: 'Court sprints (baseline to baseline)', kind: 'conditioning', lowImpact: 'Bike intervals', reps: { beginner: '6 reps', intermediate: '10 reps', advanced: '12 reps' } },
        ] },
        why: 'As a wing, you train catch-and-shoot, slashing to the rim and defending on the perimeter.',
        meals: 'fuel',
        nutritionTips: ['Carbs before practice for energy that lasts four quarters', 'Protein within an hour after training'],
      },
      {
        id: 'big', label: 'Center / big', icon: '🗼', hint: 'Post play, rebounding and strength',
        day: { focus: 'Big: post + rebounding', exercises: [
          { name: 'Post moves (drop step and hook shot)', kind: 'skill', reps: '10 min', notes: 'Seal, feel the defender, then go' },
          { name: 'Rebounding drills', kind: 'skill', reps: '4 x 6', notes: 'Box out, jump and grab it with two hands' },
          { name: 'Form shooting', kind: 'skill', reps: '10 min', notes: 'Close range, both hands, off the glass' },
          SLIDES('4 x 30s'),
          { name: 'Medicine ball chest pass', kind: 'power', reps: '8' },
        ] },
        add: { upper: [{ name: 'Bench press', kind: 'accessory', easier: 'Dumbbell bench press' }] },
        why: 'As a big, you train post footwork, rebounding and the upper-body strength to hold position in the paint.',
        calories: 1.08,
        meals: 'mass',
        nutritionTips: ['Calorie-dense meals help you hold position in the paint', 'Add a protein shake after lifting'],
      },
    ],
  },

  // ── Soccer ──
  vanguard: {
    noun: 'position',
    question: 'What position do you play?',
    prompt: 'A goalkeeper and a striker train nothing alike. Where do you play? I’ll set your week up for your role.',
    skillDay: 'skills',
    positions: [
      {
        id: 'gk', label: 'Goalkeeper', icon: '🧤', hint: 'Diving saves, safe hands and explosive steps',
        day: { focus: 'Goalkeeper: saves + handling', exercises: [
          { name: 'Goalkeeper diving saves', kind: 'skill', reps: '3 x 6 each side', notes: 'Start on a soft surface; dive low first' },
          { name: 'Catching high balls', kind: 'skill', reps: '10 min', notes: 'Hands in a W behind the ball' },
          { name: 'Lateral shuffle and set', kind: 'skill', reps: '6 x 20s', notes: 'Set your feet before the shot' },
          BOX_JUMP,
          { name: 'Distribution throwing', kind: 'skill', reps: '10 min', notes: 'Roll, sidearm and overarm to a target' },
        ] },
        swap: {
          '200m sprints': { name: 'Acceleration sprints', kind: 'sprint', lowImpact: 'Sled push', reps: '6 x 10m' },
          'Resistance sprints': { name: 'Acceleration sprints', kind: 'sprint', lowImpact: 'Sled push', reps: '8 x 10m' },
        },
        add: { power: [{ name: 'Lateral lunge', kind: 'accessory' }] },
        why: 'As a goalkeeper, you train explosive dives and jumps, safe hands and short bursts. Long running is cut back, because your game is about short, explosive bursts.',
        calories: 0.97,
        meals: 'lean',
        nutritionTips: ['You run less than outfield players: fill half your plate with veg', 'Protein at every meal for explosive power'],
      },
      {
        id: 'def', label: 'Defender', icon: '🛡️', hint: 'Strength, heading and recovery runs',
        day: { focus: 'Defender: defending + heading', exercises: [
          { name: 'Header jumps', kind: 'skill', reps: '3 x 6', notes: 'Eyes open, attack the ball with your forehead' },
          { name: 'Backpedal and break', kind: 'skill', reps: '6 x 10m', notes: 'Recovery run, then turn' },
          SLIDES('6 x 20s', 'Jockey: side-on and low'),
          { name: 'Wall passing', kind: 'skill', reps: '10 min', notes: 'Long passes with both feet' },
          { name: 'Shuttle runs', kind: 'conditioning', lowImpact: 'Bike intervals', reps: { beginner: '4 reps', intermediate: '6 reps', advanced: '8 reps' } },
        ] },
        add: { legs: [{ name: 'Back squat', kind: 'accessory', easier: 'Goblet squat' }] },
        why: 'As a defender, you train heading, jockeying, recovery runs and the leg strength to win duels.',
        meals: 'fuel',
        nutritionTips: ['Carbs the night before and the morning of a match', 'Protein after training to win duels all season'],
      },
      {
        id: 'mid', label: 'Midfielder', icon: '⚙️', hint: 'Engine, passing and vision',
        day: { focus: 'Midfielder: passing + engine', exercises: [
          { name: 'Wall passing', kind: 'skill', reps: '15 min', notes: 'One-touch and two-touch, both feet' },
          { name: 'Cone dribbling', kind: 'skill', reps: '10 min', notes: 'Scan over your shoulder between cones' },
          { name: 'Agility ladder', kind: 'skill', reps: '6 runs' },
          { name: 'Tempo runs', kind: 'conditioning', lowImpact: 'Bike tempo intervals', reps: { beginner: '6 x 100m @ 70%', intermediate: '8 x 100m @ 70%', advanced: '10 x 150m @ 70%' } },
        ] },
        swap: { 'Box jump': { name: 'Tempo runs', kind: 'conditioning', lowImpact: 'Bike tempo intervals', reps: '6 x 100m @ 70%' } },
        why: 'As a midfielder, you build the biggest engine on the team, plus passing with both feet and quick feet in tight spaces.',
        calories: 1.05,
        meals: 'fuel',
        nutritionTips: ['You cover the most ground: carbs at every meal on training days', 'Hydrate and add electrolytes on hot days'],
      },
      {
        id: 'fwd', label: 'Striker / forward', icon: '⚡', hint: 'Finishing, first step and power',
        day: { focus: 'Striker: finishing + speed', exercises: [
          { name: 'Finishing drills (shots on goal)', kind: 'skill', reps: '15 min', notes: 'Both feet; aim low and to the corners' },
          { name: 'Acceleration sprints', kind: 'sprint', lowImpact: 'Sled push', reps: '6 x 15m' },
          { name: 'Cone dribbling', kind: 'skill', reps: '10 min' },
          { name: 'Header jumps', kind: 'skill', reps: '3 x 5' },
          BOX_JUMP,
        ] },
        why: 'As a striker, you train finishing with both feet, an explosive first step and power in the air.',
        meals: 'lean',
        nutritionTips: ['Light, carb-rich meals keep your legs fresh for sprints', 'Protein at every meal for power'],
      },
    ],
  },

  // ── Baseball ──
  diamond: {
    noun: 'position',
    question: 'What position do you play?',
    prompt: 'Pitchers and outfielders use their bodies very differently. What position do you play? I’ll tailor your week.',
    skillDay: 'baseball',
    positions: [
      {
        id: 'p', label: 'Pitcher', icon: '⚾', hint: 'Arm care, mechanics and leg drive',
        day: { focus: 'Pitcher: mechanics + arm care', exercises: [
          { name: 'Throwing progression', kind: 'skill', reps: '10-15 min', notes: 'Long toss to build up; never throw through pain' },
          { name: 'Pitching mechanics (towel drill)', kind: 'skill', reps: '3 x 10', notes: 'Stride, hips, then shoulder' },
          ARM_CARE,
          { name: 'Medicine ball rotational throw', kind: 'power', reps: '6 each side' },
          { name: 'Tempo runs', kind: 'conditioning', lowImpact: 'Bike tempo intervals', reps: '6 x 100m @ 70%' },
        ] },
        swap: { 'Dumbbell bench press': { name: 'Push-up', kind: 'main', easier: 'Incline push-up' } },
        add: { upper: [{ name: 'Rear delt fly', kind: 'accessory', notes: 'Shoulder-blade strength for throwing' }] },
        why: 'As a pitcher, you train a repeatable delivery, leg drive and rotational power, with arm care every week and no heavy pressing.',
        meals: 'fuel',
        nutritionTips: ['Eat a balanced meal 3 hours before you pitch', 'Protein and carbs after you throw to help your arm recover'],
      },
      {
        id: 'c', label: 'Catcher', icon: '🥎', hint: 'Squat strength, blocking and pop time',
        day: { focus: 'Catcher: blocking + throws', exercises: [
          { name: 'Catcher blocking drills', kind: 'skill', reps: '3 x 8', notes: 'Drop to your knees, chin down, glove between your legs' },
          { name: 'Pop-time throwing drills', kind: 'skill', reps: '10 min', notes: 'Rise, transfer and throw to second' },
          { name: 'Goblet squat hold', kind: 'accessory', reps: '3 x 30s', notes: 'Build endurance for the catcher’s stance' },
          { name: 'Lateral lunge', kind: 'accessory' },
          { name: 'Hip mobility flow', kind: 'mobility', reps: '10 min' },
        ] },
        add: { lower: [{ name: 'Goblet squat', kind: 'accessory' }] },
        why: 'As a catcher, you train squat endurance, blocking, a quick throw to second and hip mobility for long innings in the crouch.',
        calories: 1.05,
        meals: 'fuel',
        nutritionTips: ['Doubleheaders: pack sandwiches, fruit and water', 'Protein at every meal for those squatting legs'],
      },
      {
        id: 'inf', label: 'Infielder', icon: '🧢', hint: 'Quick hands, footwork and short throws',
        day: { focus: 'Infielder: glove work + footwork', exercises: [
          { name: 'Fielding ground balls', kind: 'skill', reps: '15 min' },
          { name: 'Agility ladder', kind: 'skill', reps: '8 runs', notes: 'Double-play footwork' },
          SLIDES('6 x 20s', 'Range to both sides'),
          { name: 'Throwing progression', kind: 'skill', reps: '10 min', notes: 'Short, quick and accurate' },
          { name: 'Tee work (batting)', kind: 'skill', reps: '15 min' },
        ] },
        why: 'As an infielder, you train soft hands, quick double-play footwork, lateral range and short, accurate throws.',
        meals: 'lean',
        nutritionTips: ['Light meals before games keep you quick', 'Snack on fruit between innings'],
      },
      {
        id: 'of', label: 'Outfielder', icon: '🌤️', hint: 'Fly balls, crow-hop throws and speed',
        day: { focus: 'Outfielder: fly balls + arm', exercises: [
          { name: 'Catching fly balls', kind: 'skill', reps: '10 min', notes: 'Drop step, run under it, catch above your eyes' },
          { name: 'Crow-hop throwing', kind: 'skill', reps: '10 min', notes: 'Momentum toward your target' },
          { name: 'Flying sprints', kind: 'sprint', lowImpact: 'Bike sprints', reps: { beginner: '3 x 20m fly', intermediate: '4 x 30m fly', advanced: '6 x 30m fly' } },
          { name: 'Base running sprints', kind: 'skill', reps: '6 x home to first' },
          { name: 'Tee work (batting)', kind: 'skill', reps: '15 min' },
        ] },
        why: 'As an outfielder, you train reading fly balls, top speed and a strong crow-hop throw.',
        meals: 'lean',
        nutritionTips: ['Long days in the sun: water and fruit every inning', 'Carbs before games for fast first steps'],
      },
    ],
  },

  // ── Tennis ──
  rally: {
    noun: 'style',
    question: 'How do you like to play?',
    prompt: 'Baseliners and net players win points differently. How do you like to play? I’ll match your court work to your game.',
    skillDay: 'tennis',
    positions: [
      {
        id: 'baseline', label: 'Baseliner', icon: '🎾', hint: 'Heavy groundstrokes and long rallies',
        day: { focus: 'Baseliner: groundstrokes + endurance', exercises: [
          { name: 'Shadow swings (forehand/backhand)', kind: 'skill', reps: '10 min' },
          { name: 'Rally drills', kind: 'skill', reps: '25 min', notes: 'Deep crosscourt, then change direction' },
          { name: 'Split-step + lateral shuffle', kind: 'skill', reps: '6 x 30s' },
          { name: 'Tempo runs', kind: 'conditioning', lowImpact: 'Bike tempo intervals', reps: '6 x 100m @ 70%' },
        ] },
        why: 'As a baseliner, you train heavy groundstrokes, lateral movement and the endurance for long rallies.',
        meals: 'fuel',
        nutritionTips: ['Carbs before long matches; bananas between sets', 'Electrolytes when you play in the heat'],
      },
      {
        id: 'allcourt', label: 'All-court', icon: '🔄', hint: 'Baseline power plus net play',
        day: { focus: 'All-court: transition + net', exercises: [
          { name: 'Rally drills', kind: 'skill', reps: '15 min' },
          { name: 'Approach and volley drills', kind: 'skill', reps: '15 min', notes: 'Approach shot, split-step, volley' },
          { name: 'Serve practice', kind: 'skill', reps: '10 min' },
          { name: 'Court sprints', kind: 'sprint', lowImpact: 'Lateral band walk', reps: { beginner: '4 x 10m', intermediate: '6 x 15m', advanced: '8 x 20m' } },
        ] },
        why: 'As an all-court player, you train groundstrokes, approach shots, volleys and fast transitions to the net.',
        meals: 'fuel',
        nutritionTips: ['Balanced plates: carbs, protein and veg', 'Snack between matches on tournament days'],
      },
      {
        id: 'net', label: 'Serve and volley', icon: '🚀', hint: 'Big serve and quick hands at the net',
        day: { focus: 'Serve and volley: serve + net', exercises: [
          { name: 'Serve practice', kind: 'skill', reps: '20 min' },
          { name: 'Volley drills', kind: 'skill', reps: '15 min', notes: 'Short punch, firm wrist' },
          { name: 'Split-step + lateral shuffle', kind: 'skill', reps: '6 x 20s' },
          { name: 'Medicine ball rotational throw', kind: 'power', reps: '8 each side' },
        ] },
        add: { upper: [{ name: 'Rear delt fly', kind: 'accessory', notes: 'Healthy serving shoulder' }] },
        why: 'As a serve-and-volley player, you train a big serve, quick hands at the net and explosive rotation, with extra shoulder care.',
        meals: 'lean',
        nutritionTips: ['Points are short and explosive: protein at every meal', 'Light meals before matches'],
      },
      {
        id: 'doubles', label: 'Doubles', icon: '🤝', hint: 'Reflexes, poaching and serve',
        day: { focus: 'Doubles: net reflexes + serve', exercises: [
          { name: 'Volley drills', kind: 'skill', reps: '15 min', notes: 'Reflex volleys close to the net' },
          { name: 'Serve practice', kind: 'skill', reps: '15 min' },
          { name: 'Split-step + lateral shuffle', kind: 'skill', reps: '6 x 20s' },
          { name: 'Agility ladder', kind: 'skill', reps: '6 runs' },
        ] },
        why: 'As a doubles player, you train fast reflexes at the net, poaching footwork and a reliable serve.',
        meals: 'lean',
        nutritionTips: ['Light, easy-to-digest meals before you play', 'Hydrate between every game'],
      },
    ],
  },

  // ── Swimming ──
  tide: {
    noun: 'event',
    question: 'What is your main event?',
    prompt: 'Sprinters and distance swimmers need very different sets. What’s your main event? I’ll build your pool days around it.',
    skillDay: 'technique',
    positions: [
      {
        id: 'sprintfree', label: 'Sprint freestyle (50/100)', icon: '💨', hint: 'Starts, turns and top speed',
        day: pool('Pool: sprint freestyle', [
          { name: 'Streamline push-offs', kind: 'skill', reps: '8 reps', notes: 'Explode off the wall' },
          { name: 'Freestyle sprints', kind: 'conditioning', reps: { beginner: '6 x 25m', intermediate: '8 x 25m', advanced: '10 x 25m' }, notes: 'Full effort, long rest' },
          { name: 'Kickboard sets', kind: 'conditioning', reps: '6 x 25m fast' },
          { name: 'Freestyle drills (catch-up and fingertip drag)', kind: 'skill', reps: '4 x 25m' },
        ]),
        add: { legs: [{ name: 'Box jump', kind: 'power', lowImpact: 'Bodyweight squat', notes: 'Power for your start' }] },
        why: 'As a sprint freestyler, you train starts, fast walls and top speed, with dryland power for the blocks.',
        meals: 'fuel',
        nutritionTips: ['Protein after every session to build sprint power', 'A carb-rich snack 1-2 hours before practice'],
      },
      {
        id: 'distance', label: 'Distance freestyle (400+)', icon: '🌊', hint: 'A big aerobic engine and even pacing',
        day: pool('Pool: distance pacing', [
          { name: 'Freestyle intervals', kind: 'conditioning', reps: { beginner: '4 x 100m', intermediate: '6 x 200m', advanced: '5 x 400m' }, notes: 'Hold an even pace' },
          { name: 'Pull buoy freestyle', kind: 'conditioning', reps: '4 x 100m' },
          { name: 'Kickboard sets', kind: 'conditioning', reps: '4 x 50m' },
          { name: 'Freestyle drills (catch-up and fingertip drag)', kind: 'skill', reps: '4 x 50m' },
        ]),
        swap: { 'Freestyle sprints': { name: 'Freestyle intervals', kind: 'conditioning', reps: '8 x 100m', notes: 'Threshold pace' } },
        why: 'As a distance swimmer, you build a big aerobic engine and even pacing, with dryland work to keep your shoulders healthy.',
        calories: 1.08,
        meals: 'fuel',
        nutritionTips: ['Long sets burn a lot: carbs at every meal', 'Refuel within 30 minutes after big pool days'],
      },
      {
        id: 'back', label: 'Backstroke', icon: '🔙', hint: 'Rotation, a steady kick and clean walls',
        day: pool('Pool: backstroke', [
          { name: 'Backstroke drills', kind: 'skill', reps: '8 x 25m', notes: 'Rotate your shoulders; pinky enters first' },
          { name: 'Backstroke intervals', kind: 'conditioning', reps: { beginner: '4 x 25m', intermediate: '6 x 50m', advanced: '8 x 50m' } },
          { name: 'Kickboard sets', kind: 'conditioning', reps: '6 x 25m', notes: 'Kick on your back, board on your chest' },
          { name: 'Streamline push-offs', kind: 'skill', reps: '6 reps' },
        ]),
        swap: { 'Freestyle intervals': { name: 'Backstroke intervals', kind: 'conditioning', reps: { beginner: '6 x 25m', intermediate: '8 x 50m', advanced: '8 x 100m' } } },
        why: 'As a backstroker, your pool days build rotation, a steady kick and clean walls, and your aerobic sets are swum on your back.',
        meals: 'fuel',
        nutritionTips: ['Carbs fuel the pool: oats, rice and fruit', 'Snack within 30 minutes after swimming'],
      },
      {
        id: 'breast', label: 'Breaststroke', icon: '🐸', hint: 'Timing, a powerful kick and long glides',
        day: pool('Pool: breaststroke', [
          { name: 'Breaststroke drills', kind: 'skill', reps: '8 x 25m', notes: 'Pull, breathe, kick, glide' },
          { name: 'Breaststroke intervals', kind: 'conditioning', reps: { beginner: '4 x 25m', intermediate: '6 x 50m', advanced: '8 x 50m' } },
          { name: 'Kickboard sets', kind: 'conditioning', reps: '6 x 25m', notes: 'Breaststroke kick: heels to hips, then snap' },
          { name: 'Streamline push-offs', kind: 'skill', reps: '6 reps', notes: 'Pullout: one pull, one kick' },
        ]),
        swap: { 'Freestyle intervals': { name: 'Breaststroke intervals', kind: 'conditioning', reps: { beginner: '6 x 25m', intermediate: '8 x 50m', advanced: '8 x 100m' } } },
        add: { legs: [{ name: 'Lateral lunge', kind: 'accessory', notes: 'Inner-thigh strength for the kick' }] },
        why: 'As a breaststroker, you train stroke timing and a powerful kick, with dryland work for your hips and inner thighs.',
        meals: 'fuel',
        nutritionTips: ['Carbs fuel the pool: oats, rice and fruit', 'Protein after dryland days'],
      },
      {
        id: 'fly', label: 'Butterfly', icon: '🦋', hint: 'Rhythm, dolphin kick and pulling power',
        day: pool('Pool: butterfly', [
          { name: 'Butterfly drills', kind: 'skill', easier: 'Kickboard sets', reps: '8 x 25m', notes: 'One-arm fly first, then full stroke' },
          { name: 'Butterfly intervals', kind: 'conditioning', easier: 'Butterfly drills', reps: { beginner: '4 x 15m', intermediate: '6 x 25m', advanced: '8 x 25m' }, notes: 'Full rest; keep the rhythm' },
          { name: 'Streamline push-offs', kind: 'skill', reps: '6 reps', notes: 'Fast underwater dolphin kicks' },
          { name: 'Freestyle intervals', kind: 'conditioning', reps: '4 x 50m easy' },
        ]),
        add: { dryland: [{ name: 'Hollow body hold', kind: 'core', reps: '30s', notes: 'Core for the dolphin kick' }] },
        why: 'As a butterflyer, you train rhythm, a strong dolphin kick and pulling power, with extra core and shoulder work on land.',
        meals: 'fuel',
        nutritionTips: ['Butterfly is demanding: carbs before every pool session', 'Protein after dryland to build pulling strength'],
      },
      {
        id: 'im', label: 'Individual medley', icon: '🔀', hint: 'All four strokes and smooth transitions',
        day: pool('Pool: individual medley', [
          { name: 'Butterfly drills', kind: 'skill', easier: 'Kickboard sets', reps: '4 x 25m' },
          { name: 'Backstroke drills', kind: 'skill', reps: '4 x 25m' },
          { name: 'Breaststroke drills', kind: 'skill', reps: '4 x 25m' },
          { name: 'Freestyle intervals', kind: 'conditioning', reps: '4 x 50m' },
        ]),
        swap: { 'Freestyle intervals': { name: 'IM intervals: butterfly, backstroke, breaststroke, freestyle', kind: 'conditioning', reps: { beginner: '4 x 50m', intermediate: '4 x 100m', advanced: '6 x 100m' } } },
        why: 'As an IM swimmer, you train all four strokes and the transitions between them, so your aerobic sets are medley.',
        calories: 1.05,
        meals: 'fuel',
        nutritionTips: ['Four strokes, lots of work: carbs at every meal', 'Refuel within 30 minutes after big pool days'],
      },
    ],
  },

  // ── Track ──
  blaze: {
    noun: 'event',
    question: 'What is your main event?',
    prompt: 'A 100m sprinter and an 800m runner train very differently. What’s your event? I’ll build your speed days around it.',
    skillDay: 'speed',
    positions: [
      {
        id: 'sprint', label: '100m / 200m', icon: '💨', hint: 'Acceleration and top speed',
        day: { focus: 'Sprints: block starts + top speed', exercises: [
          { name: 'Block starts', kind: 'sprint', lowImpact: 'Bike sprint starts', reps: { beginner: '4 x 10m', intermediate: '6 x 20m', advanced: '8 x 20m' }, notes: 'Full rest between reps' },
          { name: 'Flying sprints', kind: 'sprint', lowImpact: 'Bike sprints', reps: { beginner: '3 x 20m fly', intermediate: '4 x 30m fly', advanced: '6 x 30m fly' } },
          { name: 'Bounding', kind: 'power', lowImpact: 'Sled push', reps: '20m' },
          { name: 'Reverse crunch', kind: 'core' },
        ] },
        why: 'As a sprinter, you train block starts, top speed and elastic power, with full rest so every rep is fast.',
        meals: 'lean',
        nutritionTips: ['Protein at every meal for fast-twitch power', 'Carbs before speed days so you feel fast'],
      },
      {
        id: '400', label: '400m', icon: '⏱️', hint: 'Speed you can hold for a full lap',
        day: { focus: '400m: speed endurance', exercises: [
          { name: 'Flying sprints', kind: 'sprint', lowImpact: 'Bike sprints', reps: '4 x 30m fly' },
          { name: 'Speed endurance sprints', kind: 'sprint', lowImpact: 'Bike tempo intervals', reps: { beginner: '3 x 150m', intermediate: '4 x 200m', advanced: '3 x 300m' }, notes: 'Full recovery between reps' },
          { name: 'Tempo runs', kind: 'conditioning', lowImpact: 'Bike tempo intervals', reps: '6 x 200m @ 70%' },
          { name: 'Side plank', kind: 'core', reps: '30s each side' },
        ] },
        why: 'As a 400m runner, you train top speed and the speed endurance to hold it for a full lap.',
        meals: 'fuel',
        nutritionTips: ['Carbs fuel speed endurance: rice, pasta and potatoes', 'Refuel soon after hard sessions'],
      },
      {
        id: 'hurdles', label: 'Hurdles', icon: '🚧', hint: 'Rhythm, hip mobility and speed',
        day: { focus: 'Hurdles: rhythm + speed', exercises: [
          { name: 'Hurdle walkovers', kind: 'mobility', reps: '3 x 8 hurdles', notes: 'Tall posture; lead knee up, trail leg out to the side' },
          { name: 'Hurdle rhythm drills', kind: 'skill', lowImpact: 'Hurdle walkovers', reps: '6 runs', notes: 'Low hurdles, three steps between' },
          { name: 'Block starts', kind: 'sprint', lowImpact: 'Bike sprint starts', reps: '5 x 15m' },
          { name: 'Hip mobility flow', kind: 'mobility', reps: '10 min' },
        ] },
        why: 'As a hurdler, you train rhythm between the hurdles, hip mobility and sprint speed.',
        meals: 'lean',
        nutritionTips: ['Protein at every meal for power', 'Carbs before hurdle sessions to stay sharp'],
      },
      {
        id: 'jumps', label: 'Long / triple jump', icon: '🦘', hint: 'A consistent approach and explosive takeoff',
        day: { focus: 'Jumps: approach + takeoff', exercises: [
          { name: 'Approach run-throughs', kind: 'sprint', lowImpact: 'Bike sprints', reps: '6 reps', notes: 'Hit the same mark every time' },
          { name: 'Pop-up jumps', kind: 'power', lowImpact: 'Step-up', reps: '6', notes: 'Drive the knee up at takeoff' },
          { name: 'Bounding', kind: 'power', lowImpact: 'Sled push', reps: '4 x 30m' },
          BROAD_JUMP,
          { name: 'Hanging leg raise', kind: 'core', easier: 'Lying leg raise' },
        ] },
        why: 'As a jumper, you train a repeatable approach, an explosive takeoff and elastic power.',
        meals: 'lean',
        nutritionTips: ['Stay light and powerful: protein and veg at every meal', 'Carbs before jump sessions'],
      },
      {
        id: 'middle', label: '800m / 1500m', icon: '🏃‍♀️', hint: 'Aerobic engine with a finishing kick',
        day: { focus: 'Middle distance: intervals', exercises: [
          { name: 'Interval runs', kind: 'conditioning', lowImpact: 'Bike intervals', reps: { beginner: '4 x 400m', intermediate: '6 x 400m', advanced: '5 x 800m' }, notes: 'Goal race pace; 90s jog between' },
          { name: 'Tempo runs', kind: 'conditioning', lowImpact: 'Bike tempo intervals', reps: '20 min steady' },
          { name: 'Flying sprints', kind: 'sprint', lowImpact: 'Bike sprints', reps: '4 x 30m fly', notes: 'Relaxed speed for your kick' },
          { name: 'Hip mobility flow', kind: 'mobility', reps: '10 min' },
        ] },
        swap: { 'Sled push': { name: 'Tempo runs', kind: 'conditioning', lowImpact: 'Bike tempo intervals', reps: '6 x 200m @ 70%' } },
        why: 'As a middle-distance runner, you train race-pace intervals, an aerobic base and a finishing kick.',
        calories: 1.06,
        meals: 'fuel',
        nutritionTips: ['More running means more carbs: oats, rice and pasta every day', 'Iron-rich foods like beans, spinach and lean red meat'],
      },
    ],
  },

  // ── Martial arts ──
  strike: {
    noun: 'style',
    question: 'What style do you train?',
    prompt: 'Kickboxers and grapplers need different engines. What style do you train? I’ll shape your skill days around it.',
    skillDay: 'kicks',
    positions: [
      {
        id: 'kick', label: 'Kickboxing / Muay Thai', icon: '🦵', hint: 'Kicks, knees and clinch power',
        day: { focus: 'Kickboxing: kicks + knees', exercises: [
          { name: 'Roundhouse kick drills', kind: 'skill', reps: '10 min', notes: 'Pivot on the standing foot' },
          { name: 'Muay Thai knee + kick combos', kind: 'skill', reps: '4 x 2 min' },
          { name: 'Heavy bag rounds', kind: 'conditioning', reps: '4 x 2 min' },
          { name: 'Dynamic flexibility', kind: 'mobility', reps: '10 min' },
        ] },
        why: 'As a kickboxer, you train powerful kicks and knees, bag rounds and the hip flexibility to kick high.',
        meals: 'lean',
        nutritionTips: ['Protein at every meal; lots of veg to stay lean', 'Water and electrolytes on bag days'],
      },
      {
        id: 'box', label: 'Boxing', icon: '🥊', hint: 'Hand speed, footwork and upper-body power',
        day: { focus: 'Boxing: hands + footwork', exercises: [
          { name: 'Shadowboxing', kind: 'skill', reps: '4 x 3 min', notes: 'Hands up; move your head' },
          { name: 'Heavy bag rounds', kind: 'conditioning', reps: '5 x 3 min' },
          { name: 'Agility ladder', kind: 'skill', reps: '6 runs', notes: 'Boxer’s footwork: light on your toes' },
          { name: 'Jump rope', kind: 'conditioning', lowImpact: 'Rowing machine', reps: '5 x 3 min' },
        ] },
        swap: { 'Muay Thai knee + kick combos': { name: 'Shadowboxing', kind: 'skill', reps: '4 x 2 min' } },
        add: {
          squat: [{ name: 'Push-up', kind: 'accessory', easier: 'Incline push-up' }],
          glutes: [{ name: 'Medicine ball rotational throw', kind: 'power', reps: '8 each side', notes: 'Punching power starts at the hips' }],
        },
        why: 'As a boxer, you train hand speed, footwork, bag rounds and rotational power, with push-ups added for your upper body.',
        meals: 'lean',
        nutritionTips: ['Steady meals, no crash diets: protein and veg at every plate', 'Hydrate all day on hard rounds'],
      },
      {
        id: 'grapple', label: 'Grappling (BJJ / wrestling)', icon: '🤼', hint: 'Hip movement, grip and takedowns',
        day: { focus: 'Grappling: hips, grips + takedowns', exercises: [
          { name: 'Hip escapes (shrimping)', kind: 'skill', reps: '4 x 30s' },
          { name: 'Sprawl drills', kind: 'skill', reps: '4 x 6', notes: 'Hips down hard, then back to your stance' },
          { name: 'Bridge and roll', kind: 'skill', reps: '3 x 8 each side' },
          { name: "Farmer's carry", kind: 'accessory', reps: '3 x 30m', notes: 'Grip strength' },
          { name: 'Pull-up', kind: 'accessory', easier: 'Assisted pull-up' },
        ] },
        swap: { 'Muay Thai knee + kick combos': { name: 'Sprawl drills', kind: 'skill', reps: '4 x 6' } },
        add: { squat: [{ name: 'Inverted row', kind: 'accessory', easier: 'Band row' }] },
        why: 'As a grappler, you train hip escapes, sprawls, grip strength and pulling power instead of kicks.',
        calories: 1.03,
        meals: 'fuel',
        nutritionTips: ['Long rolls burn a lot: carbs and protein after class', 'Stay near your weight class with steady meals, not crash diets'],
      },
      {
        id: 'mma', label: 'Mixed (MMA)', icon: '🥋', hint: 'Striking plus takedown defense',
        day: { focus: 'MMA: strikes + takedown defense', exercises: [
          { name: 'Shadowboxing', kind: 'skill', reps: '3 x 3 min' },
          { name: 'Roundhouse kick drills', kind: 'skill', reps: '5 min' },
          { name: 'Sprawl drills', kind: 'skill', reps: '3 x 6' },
          { name: 'Hip escapes (shrimping)', kind: 'skill', reps: '3 x 30s' },
          { name: 'Heavy bag rounds', kind: 'conditioning', reps: '3 x 3 min' },
        ] },
        add: { glutes: [{ name: 'Pull-up', kind: 'accessory', easier: 'Assisted pull-up' }] },
        why: 'As a mixed martial artist, you train striking, takedown defense and getting up off the mat, plus pulling strength for the clinch.',
        meals: 'fuel',
        nutritionTips: ['Carbs and protein after every session', 'Hydrate all day on hard training days'],
      },
    ],
  },
};

/** The positions (or events / styles) a coach offers, if any. */
export function positionsFor(coachId: string): PositionGroup | undefined {
  return POSITIONS[coachId];
}

export function getPosition(coachId: string, id?: string | null): Position | undefined {
  if (!id || id === NO_POSITION) return undefined;
  return POSITIONS[coachId]?.positions.find((p) => p.id === id);
}

/** The coach's program, reshaped for a position. Returns the program unchanged without one. */
export function programForPosition(coachId: string, program: CoachProgram, position?: Position): CoachProgram {
  const group = POSITIONS[coachId];
  if (!group || !position) return program;
  const days: Record<string, DayTemplate> = {};
  for (const [key, day] of Object.entries(program.days)) {
    if (key === group.skillDay) { days[key] = position.day; continue; }
    const exercises = day.exercises.map((e) => position.swap?.[e.name] ?? e);
    for (const extra of position.add?.[key] ?? []) if (!exercises.some((e) => e.name === extra.name)) exercises.push(extra);
    // A swap can repeat an exercise that's already on the day; keep the first.
    days[key] = { ...day, exercises: exercises.filter((e, i) => exercises.findIndex((x) => x.name === e.name) === i) };
  }
  return { ...program, days, nutritionTips: [...position.nutritionTips, ...program.nutritionTips] };
}
