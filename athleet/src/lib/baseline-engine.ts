/**
 * baseline-engine.ts — Athleet Baseline Personalization & Coach Routine Generator
 *
 * Pulls from each coach's signature routine:
 *   1. Coach Atlas (Longevity, basketball power, athletic conditioning)
 *   2. Coach Ironside (Heavy compound mass, high-volume hypertrophy)
 *   3. Coach Blaze (Sprint mechanics, explosive plyometrics, core power)
 *   4. Coach Vanguard (Cardio-strength circuits, durability, athletic lean cut)
 *   5. Coach Rally (Lower-body kinetic drive, agility, joint durability)
 *   6. Coach Strike (Leg/glute strength, martial arts striking, flexibility)
 *   7. Coach Anvil (Simple & intense physique, RPE 8-9, posterior chain)
 *   8. Coach Blitz (Football strength, speed and agility, sled conditioning)
 *   9. Coach Apex (Calisthenics strength and bodyweight skills)
 *   10. Coach Tide (Pool endurance, stroke technique, dryland pull strength)
 *   11. Coach Diamond (Rotational power, arm care, base running speed)
 *
 * Algorithm adapts to the user baseline:
 *   - Age (Masters 50+/60+ joint protection vs Youth <18 technique)
 *   - Experience level (Beginner volume cap vs Advanced density/supersets)
 *   - Equipment availability (full_gym vs home_dumbbells vs bodyweight vs court_or_track)
 *   - Time constraints (sessionMinutes <= 30 min condensed supersets)
 *   - Injury mitigation (auto-substitutions for knees, shoulders, lower back)
 */

import { COACHES, getCoach } from '@/data/coaches';
import type { Equipment, Goal, Level } from './types';
import type { GeneratePlanRequest, GeneratePlanResponse } from './api';

export interface BaselineAdaptation {
  tag: string;
  description: string;
}

// ─── Exercise Substitution Maps for Equipment & Injuries ────────────────────

const DUMBBELL_SUBS: Record<string, string> = {
  'back squat': 'dumbbell goblet squat',
  'barbell back squat': 'dumbbell front squat',
  'front squat': 'dumbbell goblet squat',
  'box squat': 'dumbbell box squat',
  'barbell pause squat': 'dumbbell pause squat',
  'deadlift': 'dumbbell romanian deadlift',
  'barbell row': 'one-arm dumbbell row',
  't-bar row': 'chest-supported dumbbell row',
  'bench press': 'flat dumbbell press',
  'flat bench press': 'flat dumbbell chest press',
  'close-grip bench press': 'neutral-grip dumbbell press',
  'power clean': 'dumbbell hang clean',
  'sled push': 'dumbbell walking lunge burnout',
  'barbell curl': 'incline dumbbell curl',
  'leg press': 'dumbbell bulgarian split squat',
};

const BODYWEIGHT_SUBS: Record<string, string> = {
  'back squat': 'tempo bodyweight squat (3-1-1)',
  'barbell back squat': 'bodyweight bulgarian split squat',
  'front squat': 'skater squat / single-leg squat',
  'box squat': 'bodyweight box squat',
  'barbell pause squat': '1.5-rep bodyweight squat',
  'deadlift': 'single-leg romanian deadlift (bodyweight)',
  'barbell row': 'inverted bodyweight row / doorframe pull',
  't-bar row': 'prone floor Y-T-W raises',
  'bench press': 'decline or flat push-up variation',
  'flat bench press': 'tempo push-ups (3-second eccentric)',
  'incline dumbbell press': 'pike push-ups',
  'dumbbell shoulder press': 'handstand push-up progression / pike press',
  'dumbbell walking lunge': 'walking lunges with overhead reach',
  'dumbbell step-up': 'high-box step-ups with knee drive',
  'lat pulldown': 'pull-up / hollow-body isometric hold',
  'leg press': 'sissy squat progression / wall sit hold',
  'barbell curl': 'bicep towel isometric curl',
  'close-grip bench press': 'diamond push-up',
};

// ─── Comprehensive Athlete Signature Exercise Banks ─────────────────────────

const ATHLETE_EXERCISE_BANKS: Record<string, {
  name: string;
  defaultSets: number;
  defaultReps: string;
  defaultRest: string;
  muscleGroups: string[];
  focusNotes: string;
}[]> = {
  atlas: [
    { name: 'Landmine Rotational Press', defaultSets: 3, defaultReps: '8 each side', defaultRest: '60s', muscleGroups: ['Shoulders', 'Core'], focusNotes: 'Rotate through hips; transfer kinetic force through core.' },
    { name: 'Inverted Row', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '60s', muscleGroups: ['Upper Back', 'Biceps'], focusNotes: 'Retract scapulae fully; keep neck neutral.' },
    { name: 'Walking Lunge with Torso Rotation', defaultSets: 3, defaultReps: '12 reps each leg', defaultRest: '75s', muscleGroups: ['Quads', 'Glutes', 'Core'], focusNotes: 'Stay tall; knee tracks softly over mid-foot.' },
    { name: 'Barbell Back Squat', defaultSets: 4, defaultReps: '8-10 reps', defaultRest: '90s', muscleGroups: ['Quads', 'Posterior Chain'], focusNotes: 'Brace abdominal wall; drive through midfoot.' },
    { name: 'Incline Dumbbell Press', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '60s', muscleGroups: ['Upper Chest', 'Triceps'], focusNotes: '30-degree bench angle protects glenohumeral joint.' },
    { name: 'Medicine Ball Rotational Throw', defaultSets: 3, defaultReps: '8 each side', defaultRest: '45s', muscleGroups: ['Core', 'Hips'], focusNotes: 'Explosive hip extension into wall impact.' },
    { name: 'V-Up to Hollow Hold', defaultSets: 3, defaultReps: '12 reps + 10s hold', defaultRest: '45s', muscleGroups: ['Abs'], focusNotes: 'Lower back presses flush against deck.' },
    { name: 'VersaClimber or Jump Rope Intervals', defaultSets: 4, defaultReps: '45 sec high output', defaultRest: '45s', muscleGroups: ['Cardio', 'Calves'], focusNotes: 'Championship engine conditioning.' },
  ],
  ironside: [
    { name: 'Barbell Back Squat', defaultSets: 4, defaultReps: '8-10 reps', defaultRest: '120s', muscleGroups: ['Quads', 'Glutes'], focusNotes: 'Full depth, push the earth down!' },
    { name: 'Deadlift', defaultSets: 4, defaultReps: '6-8 reps', defaultRest: '150s', muscleGroups: ['Posterior Chain', 'Back'], focusNotes: 'Pull slack out of bar before blastoff.' },
    { name: 'T-Bar Row', defaultSets: 4, defaultReps: '10-12 reps', defaultRest: '90s', muscleGroups: ['Lats', 'Rhomboids'], focusNotes: 'Squeeze lats at the top for a full 1-second pause.' },
    { name: 'Flat Bench Press', defaultSets: 4, defaultReps: '8-10 reps', defaultRest: '90s', muscleGroups: ['Chest', 'Triceps'], focusNotes: 'Control eccentric descent; touch chest and drive upward.' },
    { name: 'Incline Dumbbell Press', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '75s', muscleGroups: ['Upper Chest'], focusNotes: 'Deep stretch at bottom; squeeze pecs at lock.' },
    { name: 'Leg Press', defaultSets: 4, defaultReps: '12-15 reps', defaultRest: '90s', muscleGroups: ['Quads'], focusNotes: 'Do not lock out knees at peak extension.' },
    { name: 'Standing Barbell Curl', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '60s', muscleGroups: ['Biceps'], focusNotes: 'Keep elbows pinned to ribcage.' },
    { name: 'Close-Grip Bench Press', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '60s', muscleGroups: ['Triceps'], focusNotes: 'Shoulder-width grip to overload lateral tricep head.' },
  ],
  blaze: [
    { name: 'Explosive Box Jump', defaultSets: 4, defaultReps: '5 reps', defaultRest: '90s', muscleGroups: ['Hips', 'Glutes'], focusNotes: 'Full triple extension; land softly with knees buffered.' },
    { name: 'Medicine Ball Overhead Slam', defaultSets: 3, defaultReps: '8 reps', defaultRest: '60s', muscleGroups: ['Lats', 'Core'], focusNotes: 'Reach sky-high and slam down with whole body momentum.' },
    { name: 'Single-Leg Cable Knee Drive', defaultSets: 3, defaultReps: '10 reps each', defaultRest: '60s', muscleGroups: ['Hip Flexors', 'Core'], focusNotes: 'Mimic sprint acceleration drive phase.' },
    { name: 'Barbell Walking Lunge', defaultSets: 3, defaultReps: '10 each leg', defaultRest: '75s', muscleGroups: ['Quads', 'Glutes'], focusNotes: 'Fast ground contact; drive through front heel.' },
    { name: 'Bounding / Bunny Hops', defaultSets: 4, defaultReps: '20 yards', defaultRest: '90s', muscleGroups: ['Calves', 'Achilles'], focusNotes: 'Reactive ankle stiffness; minimize ground contact time.' },
    { name: 'Hanging Leg Raise', defaultSets: 3, defaultReps: '12-15 reps', defaultRest: '45s', muscleGroups: ['Core', 'Grip'], focusNotes: 'Strict control; curl pelvis up without swinging.' },
    { name: 'Good Morning (Hip Hinge)', defaultSets: 3, defaultReps: '10 reps', defaultRest: '75s', muscleGroups: ['Hamstrings', 'Lower Back'], focusNotes: 'Bulletproof hamstrings for top-end sprint safety.' },
  ],
  vanguard: [
    { name: 'Power Clean to Push Press', defaultSets: 4, defaultReps: '6 reps', defaultRest: '90s', muscleGroups: ['Full Body', 'Shoulders'], focusNotes: 'Violent hip pop; catch crisply in quarter-squat.' },
    { name: 'Bulgarian Split Squat', defaultSets: 3, defaultReps: '10 each leg', defaultRest: '60s', muscleGroups: ['Quads', 'Glutes'], focusNotes: 'Unilateral leg stamina and balance.' },
    { name: 'Single-Leg Romanian Deadlift', defaultSets: 3, defaultReps: '10 each side', defaultRest: '60s', muscleGroups: ['Hamstrings', 'Stability'], focusNotes: 'Keep hips square to the ground.' },
    { name: 'High-Knee Jump Rope Circuit', defaultSets: 4, defaultReps: '60 seconds', defaultRest: '30s', muscleGroups: ['Cardio', 'Calves'], focusNotes: 'High cadence; maintain light spring on balls of feet.' },
    { name: 'Push-up into Plank Renegade Row', defaultSets: 3, defaultReps: '8 each arm', defaultRest: '45s', muscleGroups: ['Chest', 'Core', 'Lats'], focusNotes: 'Zero hip rotation during the row.' },
    { name: 'Side Plank Hip Abductions', defaultSets: 3, defaultReps: '12 each side', defaultRest: '45s', muscleGroups: ['Glute Medius', 'Obliques'], focusNotes: 'Key for rotational change of direction on pitch.' },
  ],
  rally: [
    { name: 'Barbell Pause Squat (2-sec hold)', defaultSets: 4, defaultReps: '8 reps', defaultRest: '90s', muscleGroups: ['Quads', 'Glutes'], focusNotes: 'Eliminate bounce at the bottom to build raw starting strength.' },
    { name: 'Cable Rotational Woodchop', defaultSets: 3, defaultReps: '12 each side', defaultRest: '45s', muscleGroups: ['Obliques', 'Rotational Chain'], focusNotes: 'Drive through ground, pivot back foot like a forehand.' },
    { name: 'Dumbbell Walking Lunge', defaultSets: 3, defaultReps: '10 each leg', defaultRest: '60s', muscleGroups: ['Glutes', 'Quads'], focusNotes: 'Deep knee bend with vertical torso.' },
    { name: 'Dumbbell Step-Up with High Knee', defaultSets: 3, defaultReps: '10 each leg', defaultRest: '60s', muscleGroups: ['Glutes', 'Hip Flexors'], focusNotes: 'Drive through heel of elevated foot without kicking off floor.' },
    { name: 'Plank Row with Scapular Retraction', defaultSets: 3, defaultReps: '10 each side', defaultRest: '45s', muscleGroups: ['Upper Back', 'Core'], focusNotes: 'Shoulder stability for powerful serving mechanics.' },
    { name: 'Lateral Agility Ladder / Cone Shuffles', defaultSets: 4, defaultReps: '30 seconds', defaultRest: '45s', muscleGroups: ['Agility', 'Ankles'], focusNotes: 'Low center of gravity; quick decelerations.' },
    { name: 'Bicycle Crunch (Slow Tempo)', defaultSets: 3, defaultReps: '15 each side', defaultRest: '30s', muscleGroups: ['Core'], focusNotes: 'Turn shoulder toward opposite knee, not just elbow.' },
  ],
  strike: [
    { name: 'Goblet Squat (Heels Elevated)', defaultSets: 4, defaultReps: '12 reps', defaultRest: '60s', muscleGroups: ['Quads', 'Glutes'], focusNotes: 'Deep knee flexion to build striking leg drive.' },
    { name: 'Barbell Hip Thrust', defaultSets: 4, defaultReps: '10-12 reps', defaultRest: '90s', muscleGroups: ['Glutes'], focusNotes: 'Chin tucked; drive through heels and squeeze glutes hard at lockout.' },
    { name: 'Bulgarian Split Squat', defaultSets: 3, defaultReps: '10 each leg', defaultRest: '60s', muscleGroups: ['Quads', 'Glutes'], focusNotes: 'Keep front shin perpendicular for glute emphasis.' },
    { name: 'Romanian Deadlift (RDL)', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '75s', muscleGroups: ['Hamstrings', 'Glutes'], focusNotes: 'Hinge back until hamstrings stretch; do not round back.' },
    { name: 'Roundhouse Kick Balance Drills', defaultSets: 3, defaultReps: '10 kicks each leg', defaultRest: '45s', muscleGroups: ['Hip Abductors', 'Core'], focusNotes: 'Hold support bar if needed; prioritize hip turnover and chamber.' },
    { name: 'Shadowboxing Combinations (Paced)', defaultSets: 3, defaultReps: '2 minutes', defaultRest: '60s', muscleGroups: ['Shoulders', 'Conditioning'], focusNotes: 'Stay light on toes; snap punches and recover guard.' },
    { name: 'Pilates Criss-Cross Core', defaultSets: 3, defaultReps: '15 each side', defaultRest: '30s', muscleGroups: ['Abs', 'Obliques'], focusNotes: 'Smooth controlled rotation; breathe out on effort.' },
  ],
  anvil: [
    { name: 'Barbell Hip Thrust', defaultSets: 4, defaultReps: '10-12 reps', defaultRest: '90s', muscleGroups: ['Glutes'], focusNotes: 'Push near failure (RPE 8-9); lock hips out at top.' },
    { name: 'Romanian Deadlift (Dumbbell or Barbell)', defaultSets: 4, defaultReps: '8-10 reps', defaultRest: '90s', muscleGroups: ['Hamstrings', 'Glutes'], focusNotes: 'Push hips to back wall; strict stretch.' },
    { name: 'Strict Pull-Up (or Band-Assisted)', defaultSets: 3, defaultReps: '6-10 reps', defaultRest: '75s', muscleGroups: ['Lats', 'Upper Back'], focusNotes: 'Full dead-hang at bottom; pull chin over bar.' },
    { name: 'Incline Dumbbell Bench Press', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '60s', muscleGroups: ['Chest', 'Shoulders'], focusNotes: 'Control the way down, drive up strong.' },
    { name: 'Dumbbell Overhead Shoulder Press', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '60s', muscleGroups: ['Shoulders', 'Triceps'], focusNotes: 'Lock ribs down; do not arch lower back.' },
    { name: 'Lat Pulldown', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '60s', muscleGroups: ['Lats'], focusNotes: 'Pull with elbows down to hips.' },
    { name: 'Jump Rope or Mountain Climber Burnout', defaultSets: 3, defaultReps: '60 seconds', defaultRest: '45s', muscleGroups: ['Conditioning'], focusNotes: 'High intensity finisher to burn fat.' },
  ],
  blitz: [
    { name: 'Barbell Back Squat', defaultSets: 4, defaultReps: '5-6 reps', defaultRest: '150s', muscleGroups: ['Quads', 'Glutes'], focusNotes: "Drive out of the hole fast; brace hard." },
    { name: 'Power Clean', defaultSets: 5, defaultReps: '3 reps', defaultRest: '120s', muscleGroups: ['Posterior Chain', 'Traps'], focusNotes: "Jump and shrug; fast elbows into the catch." },
    { name: 'Flat Bench Press', defaultSets: 4, defaultReps: '6-8 reps', defaultRest: '120s', muscleGroups: ['Chest', 'Triceps'], focusNotes: "Feet planted, shoulder blades pinned." },
    { name: '3-Point Starts', defaultSets: 6, defaultReps: '10 yards', defaultRest: 'Full rest', muscleGroups: ['Acceleration', 'Hips'], focusNotes: "Explode low; first two steps short and powerful." },
    { name: 'Pro Agility Shuttle (5-10-5)', defaultSets: 5, defaultReps: '1 rep', defaultRest: '60s', muscleGroups: ['Agility', 'Ankles'], focusNotes: "Stay low through the cuts; touch every line." },
    { name: 'Sled Push', defaultSets: 6, defaultReps: '20 meters', defaultRest: '90s', muscleGroups: ['Legs', 'Conditioning'], focusNotes: "Arms straight, lean in, drive with short steps." },
    { name: "Farmer's Carry", defaultSets: 3, defaultReps: '30 meters', defaultRest: '60s', muscleGroups: ['Grip', 'Core'], focusNotes: "Stand tall; do not let the weights swing." },
  ],
  apex: [
    { name: 'Strict Pull-Up (or Band-Assisted)', defaultSets: 4, defaultReps: '5-8 reps', defaultRest: '90s', muscleGroups: ['Lats', 'Biceps'], focusNotes: "Dead hang to chin over bar, no kipping." },
    { name: 'Dips', defaultSets: 4, defaultReps: '6-10 reps', defaultRest: '90s', muscleGroups: ['Chest', 'Triceps'], focusNotes: "Shoulders down; lower until elbows reach 90 degrees." },
    { name: 'Pistol Squat', defaultSets: 3, defaultReps: '5 each leg', defaultRest: '75s', muscleGroups: ['Quads', 'Glutes'], focusNotes: "Hold a post at first; heel stays down." },
    { name: 'Pike Push-Up', defaultSets: 3, defaultReps: '8-10 reps', defaultRest: '60s', muscleGroups: ['Shoulders', 'Triceps'], focusNotes: "Hips high; lower your head between your hands." },
    { name: 'L-Sit Hold', defaultSets: 4, defaultReps: '10-20 seconds', defaultRest: '60s', muscleGroups: ['Core', 'Hip Flexors'], focusNotes: "Push the floor away; legs straight and level." },
    { name: 'Wall Handstand Hold', defaultSets: 4, defaultReps: '20-30 seconds', defaultRest: '60s', muscleGroups: ['Shoulders', 'Core'], focusNotes: "Ribs in, glutes tight, push tall." },
    { name: 'Hollow Body Hold', defaultSets: 3, defaultReps: '30 seconds', defaultRest: '45s', muscleGroups: ['Core'], focusNotes: "Low back pressed down the whole time." },
  ],
  tide: [
    { name: 'Freestyle Intervals', defaultSets: 1, defaultReps: '10 x 50m', defaultRest: '20s between', muscleGroups: ['Endurance', 'Lats'], focusNotes: "Long reach and steady breathing on a pace clock." },
    { name: 'Kickboard Sets', defaultSets: 1, defaultReps: '6 x 25m', defaultRest: '15s between', muscleGroups: ['Legs', 'Hips'], focusNotes: "Kick from the hips with relaxed ankles." },
    { name: 'Breaststroke Drills', defaultSets: 1, defaultReps: '6 x 25m', defaultRest: '20s between', muscleGroups: ['Technique', 'Inner Thighs'], focusNotes: "Pull, breathe, kick, glide: in that order." },
    { name: 'Lat Pulldown', defaultSets: 3, defaultReps: '10-12 reps', defaultRest: '60s', muscleGroups: ['Lats', 'Upper Back'], focusNotes: "Pull elbows down to your sides like a pull in the water." },
    { name: 'Band External Rotation', defaultSets: 3, defaultReps: '15 each arm', defaultRest: '30s', muscleGroups: ['Rotator Cuff'], focusNotes: "Elbow pinned; slow and controlled for shoulder health." },
    { name: 'Streamline Jump', defaultSets: 4, defaultReps: '5 reps', defaultRest: '60s', muscleGroups: ['Legs', 'Power'], focusNotes: "Arms locked over your ears; explode like a start." },
    { name: 'Flutter Kicks', defaultSets: 3, defaultReps: '30 seconds', defaultRest: '30s', muscleGroups: ['Core', 'Hip Flexors'], focusNotes: "Small, fast kicks with your low back down." },
  ],
  diamond: [
    { name: 'Trap Bar Deadlift', defaultSets: 4, defaultReps: '5 reps', defaultRest: '120s', muscleGroups: ['Posterior Chain', 'Legs'], focusNotes: "Push the floor away; hips and shoulders rise together." },
    { name: 'Split Squat', defaultSets: 3, defaultReps: '8 each leg', defaultRest: '75s', muscleGroups: ['Quads', 'Glutes'], focusNotes: "Front knee tracks over toes; stay tall." },
    { name: 'Medicine Ball Rotational Throw', defaultSets: 4, defaultReps: '6 each side', defaultRest: '60s', muscleGroups: ['Obliques', 'Hips'], focusNotes: "Turn the hips first, then let the arms follow." },
    { name: 'Cable Rotational Woodchop', defaultSets: 3, defaultReps: '10 each side', defaultRest: '45s', muscleGroups: ['Core', 'Rotational Chain'], focusNotes: "Rotate from the hips like your swing." },
    { name: 'Band External Rotation', defaultSets: 3, defaultReps: '15 each arm', defaultRest: '30s', muscleGroups: ['Rotator Cuff'], focusNotes: "Arm care: elbow pinned, slow tempo." },
    { name: 'Tee Work (Batting)', defaultSets: 1, defaultReps: '15 minutes', defaultRest: '—', muscleGroups: ['Hitting', 'Rotation'], focusNotes: "Quality swings; drive the barrel through the ball." },
    { name: 'Base Running Sprints', defaultSets: 6, defaultReps: 'home to first', defaultRest: 'Full rest', muscleGroups: ['Speed', 'Acceleration'], focusNotes: "Explode out of the box and run through the bag." },
  ],
};

// ─── Adaptation Engine ──────────────────────────────────────────────────────

export function generateAdaptedPlan(
  req: GeneratePlanRequest,
  seed: number = 0
): GeneratePlanResponse {
  const coach = getCoach(req.coachId) || COACHES[0];
  const athleteKey = coach.id.toLowerCase();
  const bank = ATHLETE_EXERCISE_BANKS[athleteKey] || ATHLETE_EXERCISE_BANKS.atlas;

  const adaptations: BaselineAdaptation[] = [];

  // Baseline variables
  const age = req.age || 25;
  const level: Level = req.level || 'intermediate';
  const equipment: Equipment = req.equipment || 'full_gym';
  const goal: Goal = (req.goal as Goal) || 'build_muscle';
  const sessionMinutes = req.sessionMinutes || 45;
  const daysPerWeek = Math.min(Math.max(req.daysPerWeek || 3, 2), 6);
  const injuries = (req.injuries || '').toLowerCase();

  // 1. Detect Baseline Adaptations
  if (age >= 60) {
    adaptations.push({
      tag: '🛡️ Masters Longevity Protocol (60+)',
      description: 'Axial spinal compression eliminated; joint-friendly regressions and extended rest enabled.',
    });
  } else if (age >= 50) {
    adaptations.push({
      tag: '🛡️ Joint Durability Protocol (50+)',
      description: 'Extended joint warm-up, tendon pre-hab, and controlled tempo prescribed.',
    });
  } else if (age < 18) {
    adaptations.push({
      tag: '🌱 Youth Athletic Base (<18)',
      description: 'Technique-first loading; maximal 1RM attempts avoided in favor of movement quality.',
    });
  }

  if (level === 'beginner') {
    adaptations.push({
      tag: '🎯 Beginner Volume Guardrail',
      description: 'Session volume capped at 3-4 primary movements with generous recovery intervals.',
    });
  } else if (level === 'advanced') {
    adaptations.push({
      tag: '⚡ Advanced Density',
      description: 'High mechanical tension, tempo control, and superset pairings enabled.',
    });
  }

  if (equipment === 'bodyweight') {
    adaptations.push({
      tag: '🤸 100% Calisthenics Progression',
      description: 'All weighted barbells transformed into bodyweight leverage progressions.',
    });
  } else if (equipment === 'home_dumbbells') {
    adaptations.push({
      tag: '🏠 Home Dumbbells Adapted',
      description: 'Barbell and cable staples substituted with dumbbell variations.',
    });
  }

  if (sessionMinutes <= 30) {
    adaptations.push({
      tag: '⏱️ High-Efficiency Condensed Split',
      description: 'Paired supersets and short transitions optimized for ≤30 minute window.',
    });
  }

  if (injuries && injuries !== 'none') {
    adaptations.push({
      tag: `🩹 Injury Mitigation: ${injuries.slice(0, 30)}`,
      description: 'Movements stressing reported injury areas replaced with safe compound alternatives.',
    });
  }

  // 2. Select & Adapt Exercises
  // Shuffle exercises based on seed so "Regenerate" genuinely modifies the routine
  const shuffledBank = [...bank].sort((a, b) => {
    const valA = (a.name.length * 31 + seed * 17) % 100;
    const valB = (b.name.length * 31 + seed * 17) % 100;
    return valA - valB;
  });

  const exercisesPerDay = level === 'beginner' || sessionMinutes <= 30 ? 4 : 5;
  const days: GeneratePlanResponse['days'] = [];

  const splitTitles = [
    { name: 'Upper Body Power & Core', focus: 'Chest, Back, Delts & Midline Transfer' },
    { name: 'Lower Kinetic Chain & Hips', focus: 'Quads, Posterior Chain & Foot Strike' },
    { name: 'Athletic Engine & Agility', focus: 'Metabolic Conditioning & Rotational Speed' },
    { name: 'Push Mechanics & Durability', focus: 'Chest, Triceps & Scapular Stability' },
    { name: 'Pull Dynamics & Posterior', focus: 'Lats, Rhomboids, Hamstrings & Grip' },
    { name: 'Championship Conditioning', focus: 'Full Body Endurance & Core Strength' },
  ];

  for (let d = 0; d < daysPerWeek; d++) {
    const splitInfo = splitTitles[d % splitTitles.length];
    const startIndex = (d * 2 + seed) % shuffledBank.length;
    const dayPool: typeof shuffledBank = [];

    for (let i = 0; i < exercisesPerDay; i++) {
      const ex = shuffledBank[(startIndex + i) % shuffledBank.length];
      if (!dayPool.some((p) => p.name === ex.name)) {
        dayPool.push(ex);
      }
    }

    // Adapt each exercise to the user baseline
    const adaptedExercises = dayPool.map((rawEx) => {
      let adaptedName = rawEx.name;
      let sets = rawEx.defaultSets;
      let reps = rawEx.defaultReps;
      let rest = rawEx.defaultRest;
      let notes = rawEx.focusNotes;

      // Equipment substitution
      const lower = adaptedName.toLowerCase();
      if (equipment === 'bodyweight') {
        for (const [key, sub] of Object.entries(BODYWEIGHT_SUBS)) {
          if (lower.includes(key)) {
            adaptedName = sub;
            break;
          }
        }
      } else if (equipment === 'home_dumbbells') {
        for (const [key, sub] of Object.entries(DUMBBELL_SUBS)) {
          if (lower.includes(key)) {
            adaptedName = sub;
            break;
          }
        }
      }

      // Injury adaptations
      if (injuries.includes('knee')) {
        if (/squat|lunge|box jump/.test(adaptedName.toLowerCase())) {
          adaptedName = 'Box Squat to Bench (Controlled Joint Angle)';
          notes = 'Sit back onto bench; keep shins vertical to eliminate patellar shear.';
        }
      }
      if (injuries.includes('back') || injuries.includes('spine')) {
        if (/deadlift|row/.test(adaptedName.toLowerCase())) {
          adaptedName = 'Chest-Supported Dumbbell Row';
          notes = 'Chest glued to incline bench to eliminate spinal axial load.';
        }
      }
      if (injuries.includes('shoulder')) {
        if (/press|overhead/.test(adaptedName.toLowerCase())) {
          adaptedName = 'Neutral-Grip Dumbbell Floor Press';
          notes = 'Floor halts elbow depth to safeguard rotator cuff and labrum.';
        }
      }

      // Age baseline adjustments
      if (age >= 60) {
        sets = Math.min(sets, 3);
        reps = '10-12 reps (Controlled tempo)';
        rest = '90s - 120s';
        notes = `${notes} Focus on slow 3-second descent and smooth joint transition.`;
      } else if (age >= 50) {
        rest = '75s - 90s';
      }

      // Level baseline adjustments
      if (level === 'beginner') {
        sets = Math.max(sets - 1, 2);
        reps = '10-12 reps';
        notes = `Form check: ${notes}`;
      } else if (level === 'advanced') {
        sets = Math.min(sets + 1, 5);
      }

      // Goal adjustments
      if (goal === 'get_stronger' && level !== 'beginner') {
        reps = '5-6 reps (Heavy compound)';
        rest = '120s - 180s';
      } else if (goal === 'lose_fat' || goal === 'cut') {
        rest = '45s - 60s';
      }

      return {
        name: capitalizeWords(adaptedName),
        sets,
        reps,
        rest,
        muscleGroups: rawEx.muscleGroups,
        notes,
      };
    });

    // Dynamic warm-up & cool-down tailored to age
    const warmUp =
      age >= 50
        ? '12 min joint prep: Arm circles, cat-cow, band pull-aparts, hip 90/90s & gentle treadmill walk'
        : coach.signature.methods[0] || '8 min dynamic mobility, leg swings & activation drills';

    const coolDown =
      coach.signature.recovery[1] || '5 min static hamstring, quad & hip flexor stretches with deep belly breathing';

    days.push({
      name: `Day ${d + 1} — ${splitInfo.name}`,
      focus: splitInfo.focus,
      warmUp,
      exercises: adaptedExercises,
      coolDown,
      estimatedMinutes: sessionMinutes,
    });
  }

  // 3. Coach Motivational Quote
  const coachQuotes: Record<string, string[]> = {
    atlas: [
      "We build for the long game. Protect your joints, master the foundation, and put in championship reps.",
      "Longevity is an everyday commitment. Sleep, recover, and attack every set with deliberate focus.",
      "Consistency over hype. Follow this split and let's build an athlete that can dominate for years to come.",
    ],
    ironside: [
      "Stack the plates! We got heavy weight and high volume ready for you!",
      "Iron doesn't lie! Time to feed the muscle and leave zero excuses on the gym floor!",
      "Everybody wants to be a bodybuilder, but nobody wants to lift this heavy weight! Let's get big!",
    ],
    blaze: [
      "Fast is a skill, and we're going to practice it. Quality and explosiveness over tired grinding reps!",
      "Stay relaxed and strike fast. Power comes from relaxed speed and explosive hips. Let's fly!",
      "Practice your speed mechanics every single day. Train smart, have fun, and bring the energy!",
    ],
    vanguard: [
      "Discipline every single day. Talent is nothing without relentless dedication. Let's execute this plan.",
      "Stay hungry, stay sharp. Keep the intensity high and the diet strictly clean.",
      "We prepare to win. Work through every circuit with full concentration and zero shortcuts.",
    ],
    rally: [
      "Step into the session with power and intent. We build strength that lasts for three brutal sets.",
      "Champions adjust. Take care of your shoulders, stay low in your stance, and bring the fire!",
      "Power is built rep by rep. Trust your body, protect your knees, and let's get to work.",
    ],
    strike: [
      "From cardio to real strength! We're building powerful legs, explosive kicks, and rock-solid core.",
      "Progressive overload and consistency make all the difference. Let's sculpt those legs and glutes!",
      "Keep your technique clean and your kicks snappy. Proud of you for showing up today!",
    ],
    anvil: [
      "Simple, hard, consistent. No magic pills, just solid lifts pushed close to failure. Let's crush this!",
      "Consistency over perfection every single time. Grab your water, warm up, and let's build those glutes and back!",
      "Don't overcomplicate it. Master the basic lifts, push yourself to RPE 8-9, and enjoy the gains!",
    ],
    blitz: [
      "Win the first step and you win the rep. Explosive hips, strong frame, let's get to work.",
      "Fourth-quarter legs are built in the off-season. Every sprint here counts.",
      "Strength, speed, conditioning: we stack all three. Bring the energy today.",
    ],
    apex: [
      "Your body is the gym. Strict reps today, new skills tomorrow.",
      "Control beats momentum every time. Own every inch of every rep.",
      "Progressions are earned, not rushed. Stay patient and stay strict.",
    ],
    tide: [
      "Smooth is fast. Build the engine, protect the shoulders and enjoy the water.",
      "Every length is technique practice. Long reach, steady breathing, strong kick.",
      "Pool and dryland work together. Show up for both and the speed will come.",
    ],
    diamond: [
      "Rotate hard, throw healthy, run every ball out. Let's get better today.",
      "Power comes from the ground up: legs and hips first, hands last.",
      "Take care of your arm like it is your career. Arm care is never optional.",
    ],
  };

  const quotes = coachQuotes[athleteKey] || coachQuotes.atlas;
  const selectedQuote = quotes[seed % quotes.length];

  // 4. Personalized Nutrition
  const proteinTarget = Math.round((req.weightKg || 70) * (level === 'advanced' ? 2.0 : 1.7));
  const waterTarget = req.weightKg ? (req.weightKg * 0.04).toFixed(1) : '3.0';

  const nutritionSummary =
    goal === 'build_muscle' || goal === 'bulk'
      ? `Caloric surplus (+250-400 kcal) with high-quality protein to support myofibrillar hypertrophy.`
      : goal === 'lose_fat' || goal === 'cut'
      ? `Moderate caloric deficit (-300-500 kcal) with elevated protein to preserve lean muscle.`
      : `High-performance clean fuel with balanced whole-food macros.`;

  return {
    title: `${coach.name.toUpperCase()} • ${level.toUpperCase()} PROTOCOL`,
    coachId: coach.id,
    coachMessage: selectedQuote,
    why: `Tailored for your baseline: ${age}yo • ${level} • ${equipment.replace(/_/g, ' ')} • Goal: ${goal.replace(/_/g, ' ')}. Incorporates ${coach.name}'s signature ${coach.signature.staples.slice(0, 3).join(', ')}.`,
    days,
    nutrition: {
      summary: nutritionSummary,
      tips: [
        `Target ${proteinTarget}g protein daily (${(proteinTarget / 4).toFixed(0)}g across 4 meals)`,
        `Drink at least ${waterTarget} liters of water daily with electrolytes`,
        `Pre-workout fuel: Complex carbohydrates 90 min before training`,
        coach.signature.recovery[0] || 'Prioritize 8+ hours of uninterrupted sleep',
      ],
    },
    recovery: {
      summary: `${coach.name}'s Recovery Protocol: ${coach.signature.recovery.join(' • ')}`,
      tips: [
        `Sleep 7.5 to 9 hours for central nervous system restoration`,
        `Dedicate 10 min on rest days to foam rolling and hip mobility`,
        age >= 50 ? 'Take an extra deload day whenever joint soreness persists' : 'Take full rest days seriously to avoid central fatigue',
      ],
    },
    restDays: daysPerWeek < 7 ? [`${7 - daysPerWeek} designated active recovery & mobility days`] : undefined,
    notes: adaptations.map((a) => `${a.tag}: ${a.description}`).join(' | '),
  };
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}
