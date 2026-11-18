// Coach ids used before the roster was renamed to fan-made characters. Saved plans, workout
// logs and old /chat/<id> links may still carry them, so map them to the current ids.
const LEGACY_COACH_IDS: Record<string, string> = {
  lebron: 'atlas',
  ronnie: 'ironside',
  bolt: 'blaze',
  ronaldo: 'vanguard',
  serena: 'rally',
  callina: 'strike',
  patty: 'anvil',
};

export function canonicalCoachId(id: string): string {
  return LEGACY_COACH_IDS[id] ?? id;
}
