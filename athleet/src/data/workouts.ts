// Each coach's training "DNA": themed days and staple exercises.
// The plan generator (src/lib/plan.ts) scales sets, reps, swaps and day count to the user.
// Based on publicly reported training styles; not official programs.

export type ExerciseKind =
  | 'main'          // heavy compound lift
  | 'accessory'     // hypertrophy / support work
  | 'power'         // jumps, throws, Olympic-style
  | 'sprint'
  | 'core'
  | 'skill'         // sport skills, time-based
  | 'conditioning'
  | 'mobility';

export type LevelReps = { beginner: string; intermediate: string; advanced: string };

export type TemplateExercise = {
  name: string;
  kind: ExerciseKind;
  easier?: string;          // used for beginners, under-16s and 65+
  lowImpact?: string;       // used when jumping/sprinting isn't a good idea
  reps?: string | LevelReps; // override the default prescription
  notes?: string;
};

export type DayTemplate = { focus: string; exercises: TemplateExercise[] };

export type CoachProgram = {
  warmup: string;
  cooldown: string;
  finisher: TemplateExercise; // added to strength days for fat-loss goals
  days: Record<string, DayTemplate>;
  // Which day templates to use for 3, 4, 5 and 6 training days.
  order: Record<3 | 4 | 5 | 6, string[]>;
  // Optional order when the user picked this coach's own sport.
  sportOrder?: Partial<Record<3 | 4 | 5 | 6, string[]>>;
  voice: string;              // opening line for "why this plan"
  nutritionTips: string[];
};

export const PROGRAMS: Record<string, CoachProgram> = {
  atlas: {
    voice: "We're playing the long game: strength, conditioning and recovery.",
    warmup: '20-min dynamic warm-up: light jog, leg swings, hip openers, band shoulder work',
    cooldown: '10-min yoga flow: down dog, pigeon, hamstring stretch',
    finisher: { name: 'Bike sprints (20s hard / 40s easy)', kind: 'conditioning', reps: '8-10 rounds' },
    days: {
      lower: {
        focus: 'Lower-body strength & power',
        exercises: [
          { name: 'Back squat', kind: 'main', easier: 'Goblet squat' },
          { name: 'Box jump', kind: 'power', lowImpact: 'Medicine ball chest pass', notes: 'Land soft, step down' },
          { name: 'Walking lunge', kind: 'accessory', easier: 'Reverse lunge' },
          { name: 'Single-leg Romanian deadlift', kind: 'accessory' },
          { name: 'V-up', kind: 'core', easier: 'Dead bug' },
        ],
      },
      court: {
        focus: 'Court skills + conditioning',
        exercises: [
          { name: 'Ball-handling series', kind: 'skill', reps: '10 min', notes: 'Two-ball dribbles, crossovers, between the legs' },
          { name: 'Form shooting', kind: 'skill', reps: '15 min', notes: 'Close range first, then step back' },
          { name: 'Defensive slides', kind: 'skill', reps: '6 x 30s' },
          { name: 'Court sprints (baseline to baseline)', kind: 'conditioning', lowImpact: 'Bike intervals', reps: { beginner: '6 reps', intermediate: '10 reps', advanced: '14 reps' } },
        ],
      },
      upper: {
        focus: 'Upper-body strength',
        exercises: [
          { name: 'Incline dumbbell press', kind: 'main' },
          { name: 'Inverted row', kind: 'accessory', easier: 'Band-assisted inverted row' },
          { name: 'Landmine rotational press', kind: 'power', notes: 'Drive from the hips' },
          { name: 'Dumbbell shoulder press', kind: 'accessory' },
          { name: 'Medicine ball rotational throw', kind: 'core', reps: '8 each side' },
        ],
      },
      athletic: {
        focus: 'Full-body athletic: legs, push, pull + HIIT',
        exercises: [
          { name: 'Trap bar deadlift', kind: 'main', easier: 'Kettlebell deadlift' },
          { name: 'Push-up', kind: 'accessory', easier: 'Incline push-up' },
          { name: 'Single-arm dumbbell row', kind: 'accessory', reps: '10 each side' },
          { name: 'Lateral lunge', kind: 'accessory' },
          { name: 'HIIT: VersaClimber or bike', kind: 'conditioning', reps: '12 min' },
          { name: 'Plank', kind: 'core', reps: '30-45s' },
        ],
      },
      recovery: {
        focus: 'Recovery: mobility + core',
        exercises: [
          { name: 'Yoga flow', kind: 'mobility', reps: '20 min' },
          { name: 'Side plank', kind: 'core', reps: '20-30s each side' },
          { name: 'Bird dog', kind: 'core', reps: '8 each side' },
          { name: 'Easy spin bike', kind: 'conditioning', reps: '20 min easy' },
        ],
      },
    },
    order: {
      3: ['lower', 'court', 'upper'],
      4: ['lower', 'court', 'upper', 'recovery'],
      5: ['lower', 'court', 'upper', 'athletic', 'recovery'],
      6: ['lower', 'court', 'upper', 'court', 'athletic', 'recovery'],
    },
    nutritionTips: [
      'Lean protein at every meal: chicken, fish, eggs, Greek yogurt',
      'Fruit and veg with every plate; salads before big meals',
      'Treat sleep like training: aim for 8+ hours',
      'Hydrate all day, not just at practice',
    ],
  },

  ironside: {
    voice: "Let's go! We're building size with heavy compounds and high volume.",
    warmup: '10 min light cardio, then 2 light warm-up sets on the first lift',
    cooldown: '5-10 min stretching for the muscles you trained',
    finisher: { name: 'Incline treadmill walk', kind: 'conditioning', reps: '15 min' },
    days: {
      back: {
        focus: 'Back & biceps',
        exercises: [
          { name: 'Deadlift', kind: 'main', easier: 'Romanian deadlift', notes: 'Flat back, bar close to legs' },
          { name: 'Barbell row', kind: 'main', easier: 'Seated cable row' },
          { name: 'T-bar row', kind: 'accessory', easier: 'Chest-supported dumbbell row' },
          { name: 'Lat pulldown', kind: 'accessory' },
          { name: 'Barbell curl', kind: 'accessory' },
          { name: 'Hammer curl', kind: 'accessory' },
        ],
      },
      chest: {
        focus: 'Chest & triceps',
        exercises: [
          { name: 'Bench press', kind: 'main', easier: 'Dumbbell bench press' },
          { name: 'Incline dumbbell press', kind: 'accessory' },
          { name: 'Dumbbell fly', kind: 'accessory' },
          { name: 'Close-grip bench press', kind: 'accessory', easier: 'Cable triceps pushdown' },
          { name: 'Dips', kind: 'accessory', easier: 'Bench dips' },
        ],
      },
      legs: {
        focus: 'Legs',
        exercises: [
          { name: 'Barbell back squat', kind: 'main', easier: 'Goblet squat' },
          { name: 'Leg press', kind: 'accessory' },
          { name: 'Walking lunge', kind: 'accessory' },
          { name: 'Lying leg curl', kind: 'accessory' },
          { name: 'Standing calf raise', kind: 'accessory', reps: '12-20' },
        ],
      },
      shoulders: {
        focus: 'Shoulders & arms',
        exercises: [
          { name: 'Seated dumbbell shoulder press', kind: 'main' },
          { name: 'Lateral raise', kind: 'accessory', reps: '12-15' },
          { name: 'Rear delt fly', kind: 'accessory', reps: '12-15' },
          { name: 'EZ-bar curl', kind: 'accessory' },
          { name: 'Overhead triceps extension', kind: 'accessory' },
        ],
      },
      pump: {
        focus: 'Full-body pump',
        exercises: [
          { name: 'Leg press', kind: 'accessory' },
          { name: 'Incline dumbbell press', kind: 'accessory' },
          { name: 'Lat pulldown', kind: 'accessory' },
          { name: 'Cable fly', kind: 'accessory' },
          { name: 'Cable curl', kind: 'accessory' },
          { name: 'Cable crunch', kind: 'core' },
        ],
      },
    },
    order: {
      3: ['back', 'chest', 'legs'],
      4: ['back', 'chest', 'legs', 'shoulders'],
      5: ['back', 'chest', 'legs', 'shoulders', 'pump'],
      6: ['back', 'chest', 'legs', 'back', 'chest', 'shoulders'],
    },
    nutritionTips: [
      'Eat big: 5-6 meals a day built around protein',
      'Rice, potatoes and oats to fuel heavy sessions',
      'Protein within an hour after training',
      'One full rest day: growth happens when you recover',
    ],
  },

  blaze: {
    voice: "Fast is a skill, so we'll practice it: sprint mechanics, explosive power and core every day.",
    warmup: '15-min sprint warm-up: jog, A-skips, B-skips, high knees, butt kicks, leg swings',
    cooldown: '10 min stretching: hamstrings, hip flexors, calves',
    finisher: { name: 'Tempo runs (70% effort)', kind: 'conditioning', lowImpact: 'Bike tempo intervals', reps: '6 x 100m' },
    days: {
      accel: {
        focus: 'Starts & acceleration',
        exercises: [
          { name: '3-point starts', kind: 'sprint', lowImpact: 'Bike sprint starts', reps: { beginner: '4 x 10m', intermediate: '6 x 15m', advanced: '8 x 20m' }, notes: 'Full rest between reps' },
          { name: 'Acceleration sprints', kind: 'sprint', lowImpact: 'Sled push', reps: { beginner: '4 x 20m @ 80%', intermediate: '5 x 30m', advanced: '6 x 30m' } },
          { name: 'Bunny hops', kind: 'power', lowImpact: 'Medicine ball slam', reps: '10' },
          { name: 'Hanging leg raise', kind: 'core', easier: 'Lying leg raise' },
        ],
      },
      gym: {
        focus: 'Lower-body power + core',
        exercises: [
          { name: 'Box jump', kind: 'power', lowImpact: 'Step-up', notes: 'Quality over height' },
          { name: 'Barbell lunge', kind: 'main', easier: 'Dumbbell split squat' },
          { name: 'Good morning', kind: 'main', easier: 'Romanian deadlift', notes: 'Light weight, hinge from hips' },
          { name: 'Medicine ball slam', kind: 'power' },
          { name: 'Cable knee drive', kind: 'accessory', reps: '10 each leg' },
          { name: 'Ab rollout', kind: 'core', easier: 'Plank' },
        ],
      },
      speed: {
        focus: 'Top speed',
        exercises: [
          { name: 'Flying sprints', kind: 'sprint', lowImpact: 'Bike sprints', reps: { beginner: '3 x 20m fly', intermediate: '4 x 30m fly', advanced: '6 x 30m fly' } },
          { name: 'Bounding', kind: 'power', lowImpact: 'Sled push', reps: '20m' },
          { name: 'Sled push', kind: 'accessory', reps: '4 x 20m' },
          { name: 'Reverse crunch', kind: 'core' },
        ],
      },
      power: {
        focus: 'Power & posterior chain',
        exercises: [
          { name: 'Power clean', kind: 'main', easier: 'Kettlebell swing', reps: '3-5', notes: 'Fast and crisp, stop before form breaks' },
          { name: 'Weighted step-up', kind: 'accessory' },
          { name: 'Romanian deadlift', kind: 'accessory' },
          { name: 'Hanging leg raise', kind: 'core', easier: 'Lying leg raise' },
        ],
      },
      endurance: {
        focus: 'Speed endurance + core',
        exercises: [
          { name: 'Tempo runs', kind: 'sprint', lowImpact: 'Bike tempo intervals', reps: { beginner: '4 x 100m @ 70%', intermediate: '6 x 100m @ 75%', advanced: '8 x 150m @ 75%' } },
          { name: 'Side plank', kind: 'core', reps: '30s each side' },
          { name: 'Leg raise + side sweeps', kind: 'core' },
          { name: 'Hip mobility flow', kind: 'mobility' },
        ],
      },
    },
    order: {
      3: ['accel', 'gym', 'speed'],
      4: ['accel', 'gym', 'speed', 'power'],
      5: ['accel', 'gym', 'speed', 'power', 'endurance'],
      6: ['accel', 'gym', 'speed', 'power', 'accel', 'endurance'],
    },
    nutritionTips: [
      'Keep it simple and clean: chicken, rice, veg',
      'Carbs before speed days so you feel fast',
      'Eat breakfast; never sprint on empty',
      'Hydrate well, especially in the heat',
    ],
  },

  vanguard: {
    voice: 'Discipline every day. We mix circuits, sprints, power and core.',
    warmup: '10 min: jump rope + dynamic stretches',
    cooldown: 'Stretch and foam roll; get 8 hours of sleep tonight',
    finisher: { name: 'Jump rope intervals', kind: 'conditioning', lowImpact: 'Rowing intervals', reps: '10 x 1 min' },
    days: {
      circuit: {
        focus: 'Full-body circuit: legs, push, pull + core (3 rounds)',
        exercises: [
          { name: 'Push-up', kind: 'accessory', easier: 'Incline push-up' },
          { name: 'Bulgarian split squat', kind: 'accessory', easier: 'Split squat' },
          { name: 'Inverted row', kind: 'accessory', easier: 'Band row' },
          { name: 'Single-leg Romanian deadlift', kind: 'accessory' },
          { name: 'Plank', kind: 'core', reps: '30-60s' },
          { name: 'Jump rope', kind: 'conditioning', lowImpact: 'Rowing machine', reps: '2 min' },
        ],
      },
      power: {
        focus: 'Power + sprints',
        exercises: [
          { name: 'Power clean', kind: 'main', easier: 'Kettlebell swing', reps: '3-5', notes: 'Fast and crisp, stop before form breaks' },
          { name: '200m sprints', kind: 'sprint', lowImpact: 'Bike intervals', reps: { beginner: '4 x 200m @ 75%', intermediate: '6 x 200m', advanced: '8 x 200m' } },
          { name: 'Box jump', kind: 'power', lowImpact: 'Medicine ball slam' },
        ],
      },
      legs: {
        focus: 'Legs, stability + abs',
        exercises: [
          { name: 'Front squat', kind: 'main', easier: 'Goblet squat' },
          { name: 'Single-arm side deadlift', kind: 'accessory', notes: 'Resist leaning' },
          { name: 'Lateral lunge', kind: 'accessory' },
          { name: 'Plank variations', kind: 'core', reps: '30s each' },
          { name: 'Bicycle crunch', kind: 'core', reps: '20' },
        ],
      },
      skills: {
        focus: 'Ball skills + agility',
        exercises: [
          { name: 'Cone dribbling', kind: 'skill', reps: '10 min', notes: 'Both feet, inside and outside' },
          { name: 'Wall passing', kind: 'skill', reps: '10 min' },
          { name: 'Agility ladder', kind: 'skill', reps: '6 runs' },
          { name: 'Shuttle runs', kind: 'conditioning', lowImpact: 'Bike intervals', reps: { beginner: '4 reps', intermediate: '6 reps', advanced: '8 reps' } },
        ],
      },
      upper: {
        focus: 'Upper body + core',
        exercises: [
          { name: 'Pull-up', kind: 'main', easier: 'Lat pulldown' },
          { name: 'Dumbbell bench press', kind: 'accessory' },
          { name: 'Dumbbell row', kind: 'accessory' },
          { name: 'Hanging leg raise', kind: 'core', easier: 'Lying leg raise' },
        ],
      },
      cardio: {
        focus: 'Cardio: sprints + rope',
        exercises: [
          { name: 'Jump rope', kind: 'conditioning', lowImpact: 'Rowing machine', reps: '10 x 1 min' },
          { name: 'Resistance sprints', kind: 'sprint', lowImpact: 'Sled push', reps: { beginner: '5 x 20m', intermediate: '8 x 30m', advanced: '10 x 50m' } },
        ],
      },
    },
    order: {
      3: ['circuit', 'power', 'legs'],
      4: ['circuit', 'power', 'legs', 'cardio'],
      5: ['circuit', 'power', 'legs', 'upper', 'cardio'],
      6: ['circuit', 'power', 'legs', 'upper', 'circuit', 'cardio'],
    },
    sportOrder: {
      4: ['circuit', 'power', 'legs', 'skills'],
      5: ['circuit', 'power', 'legs', 'skills', 'cardio'],
      6: ['circuit', 'power', 'legs', 'skills', 'upper', 'cardio'],
    },
    nutritionTips: [
      'High protein, Mediterranean style: fish, chicken, eggs, olive oil',
      'Wholegrain carbs and lots of fruit and veg',
      'Skip sugary drinks and sweets',
      'Small meals spread through the day',
    ],
  },

  rally: {
    voice: "We build power you can repeat for a whole match, and we protect your joints.",
    warmup: '10 min fun cardio (dance, bike or swim), then hamstring and side stretches',
    cooldown: 'Foam roll + stretch shoulders, hips and knees',
    finisher: { name: 'Dance cardio', kind: 'conditioning', reps: '15 min' },
    days: {
      lower: {
        focus: 'Lower-body power',
        exercises: [
          { name: 'Barbell pause squat', kind: 'main', easier: 'Goblet squat' },
          { name: 'Front squat', kind: 'main', easier: 'Box squat' },
          { name: 'Dumbbell walking lunge', kind: 'accessory' },
          { name: 'Dumbbell step-up', kind: 'accessory' },
          { name: 'Bicycle crunch', kind: 'core', reps: '20' },
        ],
      },
      agility: {
        focus: 'Agility + footwork',
        exercises: [
          { name: 'Agility ladder', kind: 'skill', reps: '8 runs' },
          { name: 'Split-step + lateral shuffle', kind: 'skill', reps: '6 x 20s' },
          { name: 'Court sprints', kind: 'sprint', lowImpact: 'Lateral band walk', reps: { beginner: '4 x 10m', intermediate: '6 x 15m', advanced: '8 x 20m' } },
          { name: 'HIIT circuit: squat jumps, mountain climbers', kind: 'conditioning', lowImpact: 'Low-impact circuit: squats, slow mountain climbers', reps: '10 min' },
        ],
      },
      upper: {
        focus: 'Upper body, rotation + pre-hab',
        exercises: [
          { name: 'Plank row', kind: 'accessory' },
          { name: 'Cable rotational chop', kind: 'power', reps: '10 each side' },
          { name: 'Dumbbell shoulder press', kind: 'accessory' },
          { name: 'Band external rotation', kind: 'accessory', reps: '15 each arm', notes: 'Shoulder pre-hab' },
          { name: 'Pillar hold', kind: 'core', reps: '30-45s' },
        ],
      },
      circuit: {
        focus: 'Full-body circuit: legs, push, pull + core',
        exercises: [
          { name: 'Goblet squat', kind: 'accessory' },
          { name: 'Push-up', kind: 'accessory', easier: 'Incline push-up' },
          { name: 'Dumbbell row', kind: 'accessory' },
          { name: 'Fitness ball transfer', kind: 'core', reps: '10' },
          { name: 'Rolling knee tucks', kind: 'core', reps: '12' },
          { name: 'Resistance band hip extension', kind: 'accessory', reps: '15 each leg' },
          { name: 'Dance or Zumba cardio', kind: 'conditioning', reps: '20 min' },
        ],
      },
      tennis: {
        focus: 'Tennis skills',
        exercises: [
          { name: 'Shadow swings (forehand/backhand)', kind: 'skill', reps: '10 min' },
          { name: 'Serve practice', kind: 'skill', reps: '15 min' },
          { name: 'Rally drills', kind: 'skill', reps: '20 min' },
        ],
      },
    },
    order: {
      3: ['lower', 'agility', 'upper'],
      4: ['lower', 'agility', 'upper', 'circuit'],
      5: ['lower', 'agility', 'upper', 'circuit', 'lower'],
      6: ['lower', 'agility', 'upper', 'circuit', 'lower', 'agility'],
    },
    sportOrder: {
      4: ['lower', 'agility', 'upper', 'tennis'],
      5: ['lower', 'agility', 'upper', 'tennis', 'circuit'],
      6: ['lower', 'agility', 'upper', 'tennis', 'circuit', 'tennis'],
    },
    nutritionTips: [
      'Plant-forward meals: beans, lentils, quinoa, nuts',
      'Light, easy-to-digest dinners like rice, salad and veg',
      'Eat to live during heavy training weeks',
      'Hydrate before, during and after matches',
    ],
  },

  strike: {
    voice: 'Cardio got me started, then I fell in love with lifting. We build strong legs and real kicks.',
    warmup: 'Jump rope + hip openers + leg swings (10 min)',
    cooldown: 'Flexibility work: hamstrings, hip flexors, adductors',
    finisher: { name: 'Heavy bag rounds', kind: 'conditioning', reps: '4 x 2 min' },
    days: {
      squat: {
        focus: 'Legs: squat day',
        exercises: [
          { name: 'Back squat', kind: 'main', easier: 'Goblet squat' },
          { name: 'Bulgarian split squat', kind: 'accessory', easier: 'Split squat' },
          { name: 'Leg press', kind: 'accessory' },
          { name: 'Pilates hundred', kind: 'core', reps: '100 pulses' },
        ],
      },
      kicks: {
        focus: 'Kicks + striking',
        exercises: [
          { name: 'Roundhouse kick drills', kind: 'skill', reps: '10 min', notes: 'Pivot on the standing foot' },
          { name: 'Front kick drills', kind: 'skill', reps: '5 min' },
          { name: 'Shadowboxing', kind: 'skill', reps: '3 x 2 min' },
          { name: 'Dynamic flexibility', kind: 'mobility', reps: '10 min' },
        ],
      },
      glutes: {
        focus: 'Legs: glutes & hamstrings',
        exercises: [
          { name: 'Hip thrust', kind: 'main' },
          { name: 'Romanian deadlift', kind: 'main' },
          { name: 'Lateral lunge', kind: 'accessory' },
          { name: 'Calf raise', kind: 'accessory', reps: '15-20' },
          { name: 'Dead bug', kind: 'core' },
        ],
      },
      conditioning: {
        focus: 'Martial arts conditioning',
        exercises: [
          { name: 'Muay Thai knee + kick combos', kind: 'skill', reps: '4 x 2 min' },
          { name: 'Round circuit (3 min on / 1 min off)', kind: 'conditioning', reps: '4 rounds' },
          { name: 'Russian twist', kind: 'core', reps: '20' },
        ],
      },
      unilateral: {
        focus: 'Legs: single-leg strength',
        exercises: [
          { name: 'Step-up', kind: 'accessory' },
          { name: 'Single-leg Romanian deadlift', kind: 'accessory' },
          { name: 'Cossack squat', kind: 'accessory', easier: 'Lateral lunge' },
          { name: 'Side plank', kind: 'core', reps: '30s each side' },
        ],
      },
    },
    order: {
      3: ['squat', 'kicks', 'glutes'],
      4: ['squat', 'kicks', 'glutes', 'conditioning'],
      5: ['squat', 'kicks', 'glutes', 'conditioning', 'unilateral'],
      6: ['squat', 'kicks', 'glutes', 'conditioning', 'unilateral', 'kicks'],
    },
    nutritionTips: [
      'Protein at every meal to grow those legs: eggs, chicken, tofu',
      'Eat enough; building muscle needs fuel',
      'Snack between sessions on long training days',
      'Water and electrolytes on kick days',
    ],
  },

  anvil: {
    voice: 'Simple lifts, done hard, done consistently. That is the whole secret.',
    warmup: '5-10 min jump rope, then light warm-up sets',
    cooldown: '10 min stretching + 5-10 min foam rolling',
    finisher: { name: 'HIIT finisher: burpees, jump squats, mountain climbers', kind: 'conditioning', lowImpact: 'Low-impact HIIT: squats, step-backs, slow climbers', reps: '8 min' },
    days: {
      glutes: {
        focus: 'Lower: glutes & hamstrings',
        exercises: [
          { name: 'Hip thrust', kind: 'main' },
          { name: 'Romanian deadlift', kind: 'main' },
          { name: 'Leg press', kind: 'accessory' },
          { name: 'Walking lunge', kind: 'accessory' },
          { name: 'Lying leg curl', kind: 'accessory' },
        ],
      },
      pull: {
        focus: 'Upper: back, shoulders & biceps',
        exercises: [
          { name: 'Pull-up', kind: 'main', easier: 'Assisted pull-up', notes: 'Chase total reps, split into sets' },
          { name: 'Lat pulldown', kind: 'accessory' },
          { name: 'Seated cable row', kind: 'accessory' },
          { name: 'Dumbbell shoulder press', kind: 'accessory' },
          { name: 'Dumbbell curl', kind: 'accessory' },
        ],
      },
      quads: {
        focus: 'Lower: quads',
        exercises: [
          { name: 'Back squat', kind: 'main', easier: 'Goblet squat' },
          { name: 'Leg extension', kind: 'accessory' },
          { name: 'Bulgarian split squat', kind: 'accessory', easier: 'Split squat' },
          { name: 'Hip abduction machine', kind: 'accessory', reps: '15-20' },
          { name: 'Hanging leg raise', kind: 'core', easier: 'Lying leg raise' },
        ],
      },
      push: {
        focus: 'Upper: chest, shoulders & triceps',
        exercises: [
          { name: 'Bench press', kind: 'main', easier: 'Dumbbell bench press' },
          { name: 'Incline dumbbell press', kind: 'accessory' },
          { name: 'Lateral raise', kind: 'accessory', reps: '12-15' },
          { name: 'Triceps pushdown', kind: 'accessory' },
          { name: 'Cable crunch', kind: 'core' },
        ],
      },
      hiit: {
        focus: 'HIIT + abs',
        exercises: [
          { name: 'HIIT circuit: burpees, jump squats, mountain climbers', kind: 'conditioning', lowImpact: 'Low-impact HIIT: squats, step-backs, slow climbers', reps: '20 min' },
          { name: 'Ab circuit to failure', kind: 'core', reps: '3 rounds' },
          { name: 'Stretching', kind: 'mobility', reps: '10 min' },
        ],
      },
    },
    order: {
      3: ['glutes', 'pull', 'quads'],
      4: ['glutes', 'pull', 'quads', 'push'],
      5: ['glutes', 'pull', 'quads', 'push', 'hiit'],
      6: ['glutes', 'pull', 'quads', 'push', 'glutes', 'hiit'],
    },
    nutritionTips: [
      'Lean beef, chicken and eggs: protein first',
      'Plan your meals so you are not guessing',
      'Carbs around your workouts for energy',
      'Consistency beats a perfect diet',
    ],
  },
};
