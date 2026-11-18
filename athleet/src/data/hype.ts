// Coach hype lines for the workout logger.
// Original lines, written in each coach's style.

export type HypeLines = {
  setStart: string[]; // shown when a new set begins
  rest: string[];     // shown when a rest period starts
  finish: string[];   // shown when the workout is done
};

/**
 * Each coach's signature line, spoken out loud after every logged set.
 * Spoken with the phone's text-to-speech (no real person's voice).
 * The voice is picked to fit the coach: a male or female voice, the closest accent the
 * device has, and pitch/rate for their energy (Ironside deep and loud, Blaze laid-back, etc.).
 */
export type Signature = {
  text: string;
  pitch: number; // 1 = normal; lower is deeper
  rate: number; // 1 = normal speed
  gender: 'male' | 'female';
  /** Accents to try first, best match first (BCP-47, e.g. 'en-US', 'en-GB'). */
  langs: string[];
  /** Device voices that suit this coach, best first (iOS, Android, Chrome/Edge names). */
  voices: string[];
};

export const SIGNATURES: Record<string, Signature> = {
  // Big, booming old-school bodybuilder.
  ironside: {
    text: 'STACK THE PLATES! LIFT IT!',
    pitch: 0.65,
    rate: 1.0,
    gender: 'male',
    langs: ['en-US'],
    voices: ['Ralph', 'Fred', 'Evan', 'Aaron', 'Tom', 'Guy', 'David', 'en-us-x-tpd', 'en-us-x-iom'],
  },
  // Calm, deep, measured leader.
  atlas: {
    text: 'Play the long game!',
    pitch: 0.8,
    rate: 0.92,
    gender: 'male',
    langs: ['en-US'],
    voices: ['Aaron', 'Evan', 'Nathan', 'Tom', 'Alex', 'Christopher', 'Guy', 'Mark', 'en-us-x-iol', 'en-us-x-tpd'],
  },
  // Laid-back and playful.
  blaze: {
    text: 'Catch me if you can!',
    pitch: 0.9,
    rate: 0.85,
    gender: 'male',
    langs: ['en-GB', 'en-ZA', 'en-IE', 'en-US'],
    voices: ['Daniel', 'Arthur', 'Oliver', 'Ryan', 'Google UK English Male', 'en-gb-x-rjs', 'en-gb-x-gbd'],
  },
  // Intense, stretched-out celebration.
  vanguard: {
    text: 'Vanguard, let\'s gooo!',
    pitch: 1.05,
    rate: 0.75,
    gender: 'male',
    langs: ['en-US', 'en-GB'],
    voices: ['Evan', 'Alex', 'Tom', 'Aaron', 'Guy', 'Eric', 'en-us-x-iom', 'en-us-x-iol'],
  },
  // Strong, confident American.
  rally: {
    text: 'Come on!',
    pitch: 1.0,
    rate: 1.0,
    gender: 'female',
    langs: ['en-US'],
    voices: ['Ava', 'Allison', 'Susan', 'Samantha', 'Aria', 'Jenny', 'Zira', 'Google US English', 'en-us-x-sfg'],
  },
  // Young, bright, upbeat; martial arts and leg days.
  strike: {
    text: 'Strong legs, strong kicks! Hi-yah!',
    pitch: 1.25,
    rate: 1.08,
    gender: 'female',
    langs: ['en-US', 'en-CA'],
    voices: ['Nicky', 'Zoe', 'Samantha', 'Ava', 'Michelle', 'Jenny', 'Aria', 'Google US English', 'en-us-x-tpc', 'en-us-x-iob'],
  },
  // Chill, friendly, no-nonsense.
  anvil: {
    text: "Let's get it!",
    pitch: 1.05,
    rate: 1.0,
    gender: 'female',
    langs: ['en-US'],
    voices: ['Allison', 'Samantha', 'Susan', 'Kathy', 'Jenny', 'Michelle', 'Zira', 'Google US English', 'en-us-x-iog', 'en-us-x-tpf'],
  },
};

export function signatureFor(coachId: string): Signature {
  return (
    SIGNATURES[coachId] ?? { text: "Let's go!", pitch: 1, rate: 1, gender: 'male', langs: ['en-US'], voices: [] }
  );
}

export const HYPE: Record<string, HypeLines> = {
  ironside: {
    setStart: [
      'Stack the plates!',
      'Heavy is just a number. Lift it!',
      "Iron doesn't lie. Move it!",
      'Big lifts build big people. Go!',
      "Let's get this rep train rolling!",
      'Push it! Push it! Own the bar!',
    ],
    rest: ['Breathe, baby. Next set we go heavier.', 'Catch your breath. We ain\'t done!'],
    finish: ['THAT\'S how you build it!', 'Iron day done. See you next session!'],
  },
  atlas: {
    setStart: [
      'Long game, starting with this set.',
      "Lock in. We're playing the long game.",
      'Every rep is an investment in year 20.',
      "Stay locked in. Let's work!",
      'Greatness is a habit. Build it.',
    ],
    rest: ['Recover like a pro. Breathe, hydrate.', 'Rest is part of the work. Reset.'],
    finish: ['That\'s a championship day. Play the long game!', 'Long game. You just won today.'],
  },
  blaze: {
    setStart: [
      'Catch me if you can! ⚡',
      "Relax and be fast. Let's go!",
      "Quality reps. Make 'em sharp!",
      'Easy breezy, then explode!',
      'Lightning time ⚡ Go!',
    ],
    rest: ['Full rest, no rushing. Fast needs fresh legs.', 'Chill a bit. Stay loose.'],
    finish: ['Catch me if you can! ⚡ Great session!', 'Fast day! Now go eat something good.'],
  },
  vanguard: {
    setStart: [
      'Lead from the front. Let\'s go!',
      'Discipline. Every set. Every day.',
      'Hard work beats talent. Show me.',
      'Focus. Make this one perfect.',
      'Again! Better!',
    ],
    rest: ['Breathe. Control. Next set even better.', 'Recovery is training too. Stay focused.'],
    finish: ['Workout complete! That\'s how leaders train!', 'That\'s discipline. Same time tomorrow.'],
  },
  rally: {
    setStart: [
      'Champion mindset. This set is yours.',
      "Power you can repeat. Let's go!",
      'Strong legs, strong game. Drive it!',
      "Don't hold back. Own it.",
      'Every point, every rep. Come on!',
    ],
    rest: ['Reset like between points. Breathe.', 'Shake it out. Stay ready.'],
    finish: ['Game, set, match. Great work!', 'That\'s a champion\'s session.'],
  },
  strike: {
    setStart: [
      "Strong legs, strong kicks. Let's go!",
      'I used to skip leg day too. Not anymore!',
      'Drive through the floor!',
      "Level up! You've got this.",
      'One more set, then we kick.',
    ],
    rest: ['Shake out those legs. Stay loose.', 'Quick breather, then back to it!'],
    finish: ['Legs of steel! Great session!', 'GG! That workout is cleared.'],
  },
  anvil: {
    setStart: [
      "Simple. Hard. Let's go!",
      'Close to failure. You can do one more.',
      "Don't overthink it. Just lift.",
      'Consistency wins. This set counts.',
      "Let's get it!",
    ],
    rest: ['Breathe, sip water, back at it.', 'Rest up, but not too long!'],
    finish: ['Done! Consistency over perfection!', 'Another one in the bank. Proud of you!'],
  },
};

const FALLBACK: HypeLines = {
  setStart: ["Let's go!", 'You got this!', 'Strong set!'],
  rest: ['Breathe and recover.'],
  finish: ['Great workout!'],
};

/** Picks a line, cycling so it doesn't repeat back-to-back. */
export function hypeLine(coachId: string, kind: keyof HypeLines, n: number): string {
  const lines = (HYPE[coachId] ?? FALLBACK)[kind];
  return lines[n % lines.length];
}
