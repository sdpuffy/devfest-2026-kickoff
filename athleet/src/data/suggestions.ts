// Suggested messages shown under the chat. General ones plus a few per coach.

const GENERAL = ['Make my weekly plan', 'What should I eat?', 'How do I start?', 'How should I recover?', 'Motivate me!'];

const BY_COACH: Record<string, string[]> = {
  atlas: ['How do I jump higher?', 'Help my ball-handling'],
  ironside: ['How do I build bigger arms?', 'How heavy should I lift?'],
  blaze: ['How do I get faster?', 'Best sprint drills?'],
  vanguard: ['How do I get more stamina?', 'How do you stay disciplined?'],
  rally: ['How do I protect my knees?', 'Help my footwork'],
  strike: ['How do I kick higher?', 'How do I start lifting?'],
  anvil: ['How do I grow my glutes?', 'How close to failure should I go?'],
};

export const PLAN_PROMPT = GENERAL[0];

/** Up to `count` suggestions the user hasn't asked yet, mixing coach-specific and general. */
export function suggestionsFor(coachId: string, asked: string[], count = 3): string[] {
  const done = new Set(asked.map((a) => a.trim().toLowerCase()));
  const own = BY_COACH[coachId] ?? [];
  // Plan first, then alternate coach-specific and general questions.
  const ordered: string[] = [GENERAL[0]];
  const rest = GENERAL.slice(1);
  for (let i = 0; i < Math.max(own.length, rest.length); i++) {
    if (own[i]) ordered.push(own[i]);
    if (rest[i]) ordered.push(rest[i]);
  }
  return ordered.filter((q) => !done.has(q.toLowerCase())).slice(0, count);
}

/** Demo answers for the coach-specific suggestions (used until the AI backend is connected). */
export const SUGGESTION_ANSWERS: Record<string, string> = {
  'how do i jump higher?':
    'Jumping is strength plus springs. Squat and single-leg RDLs make you strong; box jumps and quick hops teach you to use it. Do your jumps first in a session while you are fresh, 3-5 reps, full rest. Land soft. Give it 6 weeks.',
  'help my ball-handling':
    '10 minutes a day beats one long session. Pound dribbles low and hard, crossovers, between the legs, then two-ball work. Eyes up the whole time. Then do it at game speed with a defender or cones.',
  'how do i build bigger arms?':
    'Big compound lifts first, then arms: barbell curls and hammer curls for biceps, close-grip bench and overhead extensions for triceps. 3-4 sets of 10-12, squeeze every rep, add weight when you hit the top of the range. And eat!',
  'how heavy should i lift?':
    'Heavy enough that the last 2 reps are a fight but your form stays clean. If you can do more reps than the plan says, go up next set. Ego never lifts anything.',
  'how do i get faster?':
    'Speed is a skill. Short sprints at full effort, 10-30 meters, with full rest so every rep is fast. Add box jumps, bounding and strong hamstrings. Stay relaxed: tight shoulders slow you down.',
  'best sprint drills?':
    'A-skips, B-skips and high knees to warm up. Then 3-point starts for acceleration, flying 20s for top speed, and tempo runs to build endurance. Quality over quantity, always.',
  'how do i get more stamina?':
    'Mix it up: intervals like 200m sprints or jump rope rounds, plus one longer steady session a week. Recover well, sleep 8 hours, and eat clean. Stamina is built by discipline, every day.',
  'how do you stay disciplined?':
    "Make it a routine, not a mood. Same training time, same sleep time, plan your meals. Small wins every day add up.",
  'how do i protect my knees?':
    'Strong legs protect knees: pause squats, step-ups and lunges with control. Warm up properly, land softly, and never push through sharp pain. Stretch and foam roll after every session.',
  'help my footwork':
    'Agility ladder, split-steps and lateral shuffles, a few minutes every session. Stay low, stay on the balls of your feet, and recover to the middle after every move. Footwork wins points.',
  'how do i kick higher?':
    'Higher kicks come from flexible hips and strong legs. Stretch hamstrings and hip flexors daily, do leg swings, and strengthen with Bulgarian split squats and hip thrusts. Practice slow, controlled kicks before fast ones.',
  'how do i start lifting?':
    "Cardio got me started too! Start with goblet squats, hip thrusts and Romanian deadlifts, light weight, perfect form. Three days a week, add a little weight when it feels easy. You'll be surprised how fast you get strong.",
  'how do i grow my glutes?':
    'Hip thrusts, Romanian deadlifts and walking lunges are the big three. Go heavy-ish, control the lowering, squeeze at the top. Train them twice a week and eat enough protein. Simple, hard, consistent.',
  'how close to failure should i go?':
    'Most sets: 1-2 reps left in the tank. Last set of an exercise: go to failure with good form. Beginners stay a bit further away while learning. Consistency matters more than any single set.',
};
