import type { CoachProgram, TemplateExercise } from './workouts';

// Drills that need a second person (someone to throw, catch, feed or hit back), and the
// solo version used when the user trains alone. The user sets this on the Your Plan tab.
// Sets, reps and swaps stay the same; only the name and coaching note change.

export const SOLO_VERSIONS: Record<string, { name: string; notes: string }> = {
  // Football
  'Catching drills': { name: 'Self-toss catching drills', notes: 'Toss it high or off a wall; catch it away from your body, then tuck' },
  'Football throwing progression': { name: 'Football throwing at a target net', notes: 'Short to long; hit the target; stop if your arm hurts' },
  'Quarterback drop-backs (3, 5 and 7 step)': { name: 'Quarterback drop-backs to a target net', notes: 'Quick feet, eyes up, then throw at the target' },
  'Pocket movement drills': { name: 'Pocket movement drills (throw to a target net)', notes: 'Slide, reset your feet, then throw at the target' },
  'Route running (stem and break)': { name: 'Route running, solo (stem and break)', notes: 'Full speed through the break; finish looking back for the ball' },
  'Hand-fighting drills': { name: 'Hand-fighting drills on a bag', notes: 'Strike, swipe and rip against a heavy bag or pad' },
  // Soccer
  'Goalkeeper diving saves': { name: 'Goalkeeper diving technique (self-feed)', notes: 'Roll or toss the ball to one side, then dive on it; soft surface' },
  'Catching high balls': { name: 'Wall-rebound high balls', notes: 'Throw it high off a wall and catch it at the top' },
  'Distribution throwing': { name: 'Distribution throwing at a target', notes: 'Roll, sidearm and overarm to a cone or goal' },
  'Header jumps': { name: 'Header jumps (self-toss)', notes: 'Toss the ball up, jump and head it; eyes open' },
  // Baseball
  'Throwing progression': { name: 'Throwing progression into a net', notes: 'Short to long distance; stop if your arm hurts' },
  'Pop-time throwing drills': { name: 'Pop-time throwing into a net', notes: 'Rise, transfer and throw at the target' },
  'Crow-hop throwing': { name: 'Crow-hop throwing into a net', notes: 'Momentum toward the target' },
  'Fielding ground balls': { name: 'Fielding ground balls off a wall', notes: 'Throw it at a wall and field the rebound' },
  'Catching fly balls': { name: 'Self-toss fly balls', notes: 'Toss it as high as you can, drop step and catch it above your eyes' },
  'Catcher blocking drills': { name: 'Catcher blocking drills (self-feed)', notes: 'Bounce a ball off a wall into the dirt, or drill the drop without one' },
  // Tennis
  'Rally drills': { name: 'Rally drills against a wall', notes: 'Forehands and backhands against a practice wall' },
  'Volley drills': { name: 'Wall volleys', notes: 'Stand close to a wall; short, quick punch volleys' },
  'Approach and volley drills': { name: 'Approach shots and wall volleys', notes: 'Drop-hit an approach shot, then volley against a wall' },
};

/** True if any of the program's drills needs a partner. */
export function needsPartner(program: CoachProgram): boolean {
  return Object.values(program.days).some((d) => d.exercises.some((e) => SOLO_VERSIONS[e.name]));
}

/** The program with every partner drill switched to its solo version. */
export function soloProgram(program: CoachProgram): CoachProgram {
  if (!needsPartner(program)) return program;
  const solo = (e: TemplateExercise): TemplateExercise => {
    const s = SOLO_VERSIONS[e.name];
    return s ? { ...e, name: s.name, notes: s.notes } : e;
  };
  const days = Object.fromEntries(Object.entries(program.days).map(([k, d]) => [k, { ...d, exercises: d.exercises.map(solo) }]));
  return { ...program, days };
}
