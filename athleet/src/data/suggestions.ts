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
  blitz: ['How do I get faster off the line?', 'How do I bulk up for football?'],
  apex: ['How do I get my first pull-up?', 'How do I learn a handstand?'],
  tide: ['How do I breathe better when I swim?', 'What should I do on land to swim faster?'],
  diamond: ['How do I hit with more power?', 'How do I keep my arm healthy?'],
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
  'how do i get faster off the line?':
    "Speed off the line is a stance and a first step. Weight slightly forward, back knee loaded, then push the ground away and drive your knee, low and hard. Practice 3-point starts for 5-10 yards with full rest, twice a week, and keep squatting and power cleaning to build the push.",
  'how do i bulk up for football?':
    "Eat more and lift heavy. Add a meal or a shake a day, protein at every meal, and plenty of rice, potatoes and pasta around practice. Squat, bench, clean and deadlift 2-3 times a week, and add weight a little at a time. Aim for slow, steady gains so you stay fast.",
  'how do i get my first pull-up?':
    "Build it in steps: dead hangs for grip, Australian pull-ups for strength, then slow negatives: jump to the top and lower yourself for 3-5 seconds. Do 3-4 sets two or three times a week. When negatives feel easy, try one strict rep. Most people get there in a few weeks.",
  'how do i learn a handstand?':
    "Start against a wall. Pike push-ups and wall holds build the shoulders; hollow holds teach the straight body line. Hands shoulder-width, push the floor away, ribs in, glutes tight. Do short 20-30 second holds with good form, and practice a few minutes almost every day.",
  'how do i breathe better when i swim?':
    "Breathe out steadily underwater through your nose and mouth, so you only need to breathe in when you turn. Turn your head with your body roll and keep one goggle in the water. Practice breathing every 3 strokes on easy laps, then use it on harder sets.",
  'what should i do on land to swim faster?':
    "Pull strength, shoulder care and a strong core. Lat pulldowns or pull-ups, band external rotations, planks and flutter kicks, plus streamline jumps for your starts. Two dryland sessions a week is plenty; keep the pool for technique and conditioning.",
  'how do i hit with more power?':
    "Power comes from the ground up: load your back hip, take a short stride, then turn your hips before your hands. Train it with medicine ball rotational throws, cable chops and trap bar deadlifts, and take quality swings off a tee so your mechanics stay clean.",
  'how do i keep my arm healthy?':
    "Warm up properly, build your throwing distance gradually, and respect pitch and throw counts. Do band external rotations and rows every week for the back of the shoulder, and stretch after throwing. If your arm hurts, stop and rest it; never throw through pain.",
};
