import { frames, smoothTrack } from './mascot-motion';
import type { sampleSpeech } from './speech-animation';

export type CoachMotion = 'idle' | 'talking' | 'exercise' | 'celebrate' | 'thinking';
const tracks = {
  breathe: smoothTrack([0, 1, 2, 1, 0, -1, -2, -1, 0]),
  nod: smoothTrack([0, -2, -4, -3, 0, 2, 3, 1, 0]),
  squat: smoothTrack([0, .05, .4, .85, 1, .85, .4, .05, 0]),
  celebrate: smoothTrack([0, 6, -18, -9, 4, -10, 2, 0, 0]),
  wave: smoothTrack([0, -6, 24, -14, 20, -8, 5, 0, 0]),
};
function track(values: number[], time: number, duration: number) {
  const phase = (time % duration) / duration;
  const i = Math.max(0, frames.findIndex((value, index) => index < frames.length - 1 && phase < frames[index + 1]));
  const weight = (phase - frames[i]) / (frames[i + 1] - frames[i]);
  return values[i] + (values[i + 1] - values[i]) * weight;
}
export const easeInOut = (t: number) => { const p = Math.max(0, Math.min(1, t)); return p * p * (3 - 2 * p); };
export function coachPose(time: number, motion: CoachMotion, reduced: boolean, speech: ReturnType<typeof sampleSpeech>) {
  const t = reduced ? 0 : time;
  const squat = motion === 'exercise' ? track(tracks.squat, t, 3.1) : 0;
  const celebrating = motion === 'celebrate';
  const talking = motion === 'talking';
  const blinkTime = t % 4.5;
  const blink = blinkTime > 4.25 ? Math.sin((blinkTime - 4.25) / .25 * Math.PI) : 0;
  return {
    body: (1 - Math.cos(squat * .918)) * 56 + (celebrating ? track(tracks.celebrate, t, 3.1) : track(tracks.breathe, t, 3.1)),
    head: motion === 'thinking' ? 8 + track(tracks.nod, t, 3.1) : track(tracks.nod, t, 3.1) * .5 + (talking && !reduced ? speech.emphasis * 3 : 0),
    left: celebrating ? 110 + track(tracks.wave, t, 3.1) * .3 : squat * 65 + (talking ? 12 + (reduced ? 0 : speech.emphasis * 12) : 0),
    right: celebrating ? -110 - track(tracks.wave, t, 3.1) * .3 : motion === 'thinking' ? -38 : -squat * 65 - (talking ? 12 + (reduced ? 0 : speech.emphasis * 16) : 0),
    knee: squat * .918 * 180 / Math.PI,
    eyes: Math.max(.06, 1 - blink * .94 - (celebrating ? .15 : talking ? speech.smile * .12 : 0)),
    mouth: talking ? .12 + speech.open * .88 : celebrating ? .9 : .14,
    width: talking ? speech.width + speech.smile * .12 : celebrating ? 1.15 : 1,
    brow: talking ? -speech.brow * 5 : motion === 'thinking' ? 3 : celebrating ? -4 : 0,
    confetti: celebrating ? 1 : 0,
    leftLeg: 0, rightLeg: 0, tilt: 0,
  };
}
export type CoachPose = ReturnType<typeof coachPose>;
