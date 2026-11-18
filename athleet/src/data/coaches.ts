import { canonicalCoachId } from '../lib/coach-ids';
import type { Coach } from '@/lib/types';

// Coach roster: original, fan-made characters. Training styles draw on common, publicly known methods.
export const COACHES: Coach[] = [
  {
    "id": "atlas",
    "name": "Coach Atlas",
    "sport": "basketball",
    "category": "Basketball",
    "trainingTypes": [
      "athletic",
      "strength",
      "conditioning",
      "mobility"
    ],
    "goals": [
      "sport_performance",
      "general_fitness",
      "lose_fat",
      "build_muscle"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      13,
      75
    ],
    "intensity": 4,
    "tagline": "Train for the long game.",
    "bio": "Built for longevity: strength, conditioning and recovery so you can keep hooping for decades.",
    "bestFor": [
      "basketball skills",
      "athleticism",
      "older athletes",
      "longevity"
    ],
    "signature": {
      "split": "3 strength days + 2-3 conditioning/court days",
      "staples": [
        "inverted row",
        "landmine rotational press",
        "walking lunge",
        "back squat",
        "incline dumbbell press",
        "V-up",
        "medicine ball rotational throw"
      ],
      "methods": [
        "long 20-30 min warm-up",
        "supersets",
        "HIIT conditioning",
        "finish with yoga/mobility"
      ],
      "recovery": [
        "sleep first",
        "mobility and yoga",
        "deload when legs feel heavy"
      ]
    },
    "avatar": "atlas.png",
    "icon": "🏀",
    "color": "#1f8a8a",
    "greeting": "What's good! I'm Coach Atlas. We train for the long game here: strength, conditioning and recovery. Tell me what you want to work on and I'll build your week."
  },
  {
    "id": "ironside",
    "name": "Coach Ironside",
    "sport": "bodybuilding",
    "category": "Bodybuilding",
    "trainingTypes": [
      "hypertrophy",
      "strength"
    ],
    "goals": [
      "build_muscle",
      "bulk",
      "get_stronger"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      16,
      70
    ],
    "intensity": 5,
    "tagline": "Heavy weight, high volume, no excuses.",
    "bio": "Old-school mass building: big compound lifts, lots of volume, and relentless consistency.",
    "bestFor": [
      "building mass",
      "bulking",
      "classic bodybuilding"
    ],
    "signature": {
      "split": "push/pull/legs style, each muscle twice per week (scaled to available days)",
      "staples": [
        "barbell back squat",
        "deadlift",
        "barbell row",
        "T-bar row",
        "bench press",
        "incline dumbbell press",
        "leg press",
        "barbell curl",
        "close-grip bench press"
      ],
      "methods": [
        "heavy compounds first",
        "high volume accessories",
        "progressive overload",
        "rest-pause sets (advanced only)"
      ],
      "recovery": [
        "eat big",
        "sleep 8 hours",
        "one full rest day"
      ]
    },
    "avatar": "ironside.png",
    "icon": "💪",
    "color": "#3d4f8a",
    "greeting": "Let's go! Ready to build some serious size? I'm Coach Ironside. Tell me how many days you can train and let's get to work!"
  },
  {
    "id": "blaze",
    "name": "Coach Blaze",
    "sport": "track",
    "category": "Track & Speed",
    "trainingTypes": [
      "athletic",
      "conditioning",
      "mobility"
    ],
    "goals": [
      "sport_performance",
      "lose_fat",
      "general_fitness"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      12,
      65
    ],
    "intensity": 4,
    "tagline": "Fast is a skill. Let's practice it.",
    "bio": "Explosive power, sprint mechanics and daily core work. Quality reps over grinding.",
    "bestFor": [
      "speed",
      "explosiveness",
      "vertical jump",
      "athletic fat loss"
    ],
    "signature": {
      "split": "2-3 speed/plyo days + 2 gym power days + daily core",
      "staples": [
        "box jump",
        "medicine ball slam",
        "good morning",
        "barbell lunge",
        "bounding",
        "bunny hops",
        "cable knee drive",
        "hanging leg raise",
        "sled push"
      ],
      "methods": [
        "sprint phases: starts, acceleration, top speed, deceleration",
        "plyometrics",
        "core every day",
        "full rest between sprints"
      ],
      "recovery": [
        "stretch hamstrings and hips",
        "keep it fun",
        "never sprint tired"
      ]
    },
    "avatar": "blaze.png",
    "icon": "⚡",
    "color": "#e2462f",
    "greeting": "Hey hey! Coach Blaze here, your speed coach. Fast is a skill, and we're gonna practice it. What do you want: speed, explosiveness, or getting lean?"
  },
  {
    "id": "vanguard",
    "name": "Coach Vanguard",
    "sport": "soccer",
    "category": "Soccer",
    "trainingTypes": [
      "athletic",
      "conditioning",
      "hypertrophy"
    ],
    "goals": [
      "sport_performance",
      "lose_fat",
      "cut",
      "build_muscle",
      "general_fitness"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      12,
      70
    ],
    "intensity": 5,
    "tagline": "Discipline every day. Mix it up.",
    "bio": "Lean, fast and durable: circuits, sprints, power work and a strict clean diet.",
    "bestFor": [
      "soccer fitness",
      "getting lean",
      "discipline",
      "conditioning"
    ],
    "signature": {
      "split": "5 training days: circuits, power + sprints, legs/core, cardio; 1-2 rest days",
      "staples": [
        "power clean",
        "200m sprint",
        "resistance sprint",
        "jump rope",
        "single-leg Romanian deadlift",
        "Bulgarian split squat",
        "plank variations",
        "push-up"
      ],
      "methods": [
        "full-body circuits",
        "HIIT",
        "mix cardio and weights",
        "short daily ab work at home"
      ],
      "recovery": [
        "8 hours sleep",
        "high-protein Mediterranean eating",
        "avoid sugary foods"
      ]
    },
    "avatar": "vanguard.png",
    "icon": "⚽",
    "color": "#2f6fd0",
    "greeting": "Welcome. I'm Coach Vanguard. Discipline every day, that's how we win. Tell me your goal and how many days you can train."
  },
  {
    "id": "rally",
    "name": "Coach Rally",
    "sport": "tennis",
    "category": "Tennis",
    "trainingTypes": [
      "athletic",
      "strength",
      "mobility",
      "conditioning"
    ],
    "goals": [
      "sport_performance",
      "get_stronger",
      "lose_fat",
      "general_fitness"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      12,
      75
    ],
    "intensity": 4,
    "tagline": "Power you can repeat for three sets.",
    "bio": "Lower-body and rotational power, agility, and joint care that keeps you on court.",
    "bestFor": [
      "tennis/racket sports",
      "lower-body power",
      "joint health",
      "women new to strength"
    ],
    "signature": {
      "split": "2-3 strength days + 2 agility/cardio days",
      "staples": [
        "barbell pause squat",
        "front squat",
        "box squat",
        "dumbbell walking lunge",
        "dumbbell step-up",
        "plank row",
        "cable rotational chop",
        "bicycle crunch",
        "agility ladder"
      ],
      "methods": [
        "10-minute fun cardio warm-up (dance, bike, swim)",
        "3-5 sets of 8-12",
        "agility work",
        "shoulder and knee pre-hab"
      ],
      "recovery": [
        "stretching and foam rolling",
        "variety to avoid burnout"
      ]
    },
    "avatar": "rally.png",
    "icon": "🎾",
    "color": "#7b3fa0",
    "greeting": "Hey champ! I'm Coach Rally. We'll build power you can repeat and keep your joints happy. What are we working toward?"
  },
  {
    "id": "strike",
    "name": "Coach Strike",
    "sport": "martial_arts",
    "category": "Martial Arts & Legs",
    "trainingTypes": [
      "hypertrophy",
      "athletic",
      "mobility"
    ],
    "goals": [
      "build_muscle",
      "general_fitness",
      "sport_performance"
    ],
    "levels": [
      "beginner",
      "intermediate"
    ],
    "ageFit": [
      15,
      55
    ],
    "intensity": 3,
    "tagline": "From cardio to strength, one kick at a time.",
    "bio": "Leg-focused strength plus kicking and striking skills. Great if you're new to lifting.",
    "bestFor": [
      "leg and glute strength",
      "martial arts basics",
      "beginners switching from cardio"
    ],
    "signature": {
      "split": "3 leg-focused lifting days + 2 martial arts skill days",
      "staples": [
        "goblet squat",
        "back squat",
        "hip thrust",
        "Bulgarian split squat",
        "Romanian deadlift",
        "leg press",
        "roundhouse kick drills",
        "shadowboxing",
        "Pilates core"
      ],
      "methods": [
        "progressive leg training",
        "kick technique and flexibility",
        "short skill circuits"
      ],
      "recovery": [
        "hip and hamstring flexibility",
        "eat enough protein"
      ]
    },
    "avatar": "strike.png",
    "icon": "🥋",
    "color": "#d63a3a",
    "greeting": "Hi! I'm Coach Strike. Cardio got me started, lifting made me strong. Want to build strong legs and learn some kicks?"
  },
  {
    "id": "anvil",
    "name": "Coach Anvil",
    "sport": "fitness",
    "category": "Gym & Physique",
    "trainingTypes": [
      "hypertrophy",
      "strength",
      "conditioning"
    ],
    "goals": [
      "build_muscle",
      "lose_fat",
      "cut",
      "general_fitness"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      16,
      60
    ],
    "intensity": 4,
    "tagline": "Simple, hard, consistent.",
    "bio": "Relatable gym training: straightforward lifts pushed close to failure, plus quick HIIT.",
    "bestFor": [
      "general gym-goers",
      "glutes and back",
      "getting lean and strong"
    ],
    "signature": {
      "split": "upper/lower or push/pull/legs, 4-5 days",
      "staples": [
        "hip thrust",
        "Romanian deadlift",
        "pull-up",
        "lat pulldown",
        "bench press",
        "dumbbell shoulder press",
        "leg press",
        "jump rope"
      ],
      "methods": [
        "train close to failure",
        "straightforward progression",
        "HIIT circuits",
        "stretch and foam roll after"
      ],
      "recovery": [
        "consistency over perfection",
        "foam rolling"
      ]
    },
    "avatar": "anvil.png",
    "icon": "🏋️",
    "color": "#d9a21b",
    "greeting": "Hey! Coach Anvil here. Simple lifts, done hard, done consistently. What's your goal and how often can you get to the gym?"
  },
  {
    "id": "blitz",
    "name": "Coach Blitz",
    "sport": "football",
    "category": "American Football",
    "trainingTypes": [
      "strength",
      "athletic",
      "conditioning"
    ],
    "goals": [
      "sport_performance",
      "get_stronger",
      "build_muscle",
      "bulk"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      13,
      60
    ],
    "intensity": 5,
    "tagline": "Win the first step. Own the fourth quarter.",
    "bio": "Football strength and speed: explosive hips, a strong frame, quick feet and conditioning that lasts all game.",
    "bestFor": [
      "football",
      "explosive power",
      "getting bigger and faster",
      "team-sport conditioning"
    ],
    "signature": {
      "split": "2 strength days + 1 speed/agility day + 1 conditioning day (+ football skills)",
      "staples": [
        "back squat",
        "bench press",
        "power clean",
        "Romanian deadlift",
        "3-point starts",
        "pro agility shuttle",
        "sled push",
        "farmer's carry"
      ],
      "methods": [
        "heavy compound lifts",
        "Olympic-style power work",
        "short sprints with full rest",
        "agility and change of direction"
      ],
      "recovery": [
        "eat enough to grow",
        "sleep 8+ hours",
        "foam roll and stretch hips after practice"
      ]
    },
    "avatar": "blitz.png",
    "icon": "🏈",
    "color": "#2e7d4f",
    "greeting": "Let's work! I'm Coach Blitz. We build football strength and speed: explosive hips, quick feet and gas in the tank for the fourth quarter. What position do you play, and how many days can you train?"
  },
  {
    "id": "apex",
    "name": "Coach Apex",
    "sport": "calisthenics",
    "category": "Calisthenics",
    "trainingTypes": [
      "strength",
      "hypertrophy",
      "mobility"
    ],
    "goals": [
      "get_stronger",
      "build_muscle",
      "general_fitness",
      "lose_fat",
      "cut"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      12,
      65
    ],
    "intensity": 4,
    "tagline": "Your body is the gym. Earn every skill.",
    "bio": "Bodyweight strength and control: strict pull-ups, dips and pistols, building up to handstands, L-sits and levers.",
    "bestFor": [
      "training anywhere",
      "relative strength",
      "bodyweight skills",
      "lean, athletic physique"
    ],
    "signature": {
      "split": "pull / push / legs + a skill day, 4-5 days",
      "staples": [
        "pull-up",
        "dips",
        "pike push-up",
        "pistol squat",
        "L-sit hold",
        "wall handstand hold",
        "tuck front lever hold",
        "muscle-up negatives"
      ],
      "methods": [
        "strict form before progressions",
        "progressive skill steps",
        "isometric holds",
        "short bodyweight conditioning circuits"
      ],
      "recovery": [
        "wrist and shoulder prep every session",
        "mobility for hips, hamstrings and lats",
        "rest days are part of skill work"
      ]
    },
    "avatar": "apex.png",
    "icon": "🤸",
    "color": "#e0457b",
    "greeting": "Hey! I'm Coach Apex. No machines needed: we build real strength with your own bodyweight, then turn it into skills like handstands and L-sits. Where are you starting from? Can you do a pull-up yet?"
  },
  {
    "id": "tide",
    "name": "Coach Tide",
    "sport": "swimming",
    "category": "Swimming",
    "trainingTypes": [
      "conditioning",
      "athletic",
      "mobility"
    ],
    "goals": [
      "sport_performance",
      "lose_fat",
      "general_fitness",
      "cut"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      8,
      85
    ],
    "intensity": 3,
    "tagline": "Smooth is fast. Build your engine.",
    "bio": "Pool workouts for endurance and technique, plus dryland strength for strong, healthy shoulders and a powerful kick.",
    "bestFor": [
      "swimming",
      "low-impact cardio",
      "joint-friendly fitness",
      "older athletes"
    ],
    "signature": {
      "split": "2-3 pool days + 2 dryland strength days",
      "staples": [
        "freestyle intervals",
        "kickboard sets",
        "backstroke drills",
        "breaststroke drills",
        "lat pulldown",
        "band external rotation",
        "streamline jump",
        "flutter kicks"
      ],
      "methods": [
        "interval sets on a pace clock",
        "stroke technique drills",
        "kick sets",
        "dryland pull and core strength"
      ],
      "recovery": [
        "easy backstroke cool-down",
        "shoulder and lat stretching",
        "refuel within 30 minutes"
      ]
    },
    "avatar": "tide.png",
    "icon": "🏊",
    "color": "#1e6fb8",
    "greeting": "Hi, I'm Coach Tide! We'll build your engine in the pool and a strong, healthy swimmer's body on land. Smooth is fast. Do you have pool access, and how comfortable are you in the water?"
  },
  {
    "id": "diamond",
    "name": "Coach Diamond",
    "sport": "baseball",
    "category": "Baseball",
    "trainingTypes": [
      "athletic",
      "strength",
      "mobility"
    ],
    "goals": [
      "sport_performance",
      "get_stronger",
      "general_fitness",
      "build_muscle"
    ],
    "levels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "ageFit": [
      10,
      70
    ],
    "intensity": 3,
    "tagline": "Rotate hard. Throw healthy. Run every ball out.",
    "bio": "Rotational power for hitting and throwing, arm care for a healthy shoulder, and quick first steps on the bases.",
    "bestFor": [
      "baseball and softball",
      "rotational power",
      "arm health",
      "speed on the bases"
    ],
    "signature": {
      "split": "2 strength days + 1 speed day + baseball skill work",
      "staples": [
        "trap bar deadlift",
        "split squat",
        "medicine ball rotational throw",
        "cable rotational chop",
        "band external rotation",
        "tee work",
        "throwing progression",
        "base running sprints"
      ],
      "methods": [
        "rotational medicine ball power",
        "single-leg strength",
        "year-round arm care",
        "short sprints and first-step speed"
      ],
      "recovery": [
        "arm care before and after throwing",
        "hip and thoracic mobility",
        "respect pitch and throw counts"
      ]
    },
    "avatar": "diamond.png",
    "icon": "⚾",
    "color": "#c8102e",
    "greeting": "Hey, I'm Coach Diamond. We'll build rotational power for hitting and throwing, keep your arm healthy and get you quicker out of the box. What position do you play?"
  }
];

export function getCoach(id: string): Coach | undefined {
  const coachId = canonicalCoachId(id);
  return COACHES.find((c) => c.id === coachId);
}

/** The coach's name without the "Coach " title, e.g. "Atlas". */
export function coachShortName(coach: Pick<Coach, 'name'>): string {
  return coach.name.replace(/^Coach\s+/, '');
}
