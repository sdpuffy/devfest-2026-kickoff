// Pure sync decisions, kept free of React Native imports so the node tests can load them.

export type SyncItem = { value: unknown; updatedAt: number };

export type SyncDecision = 'pull' | 'push' | 'none';

/**
 * What to do with one key.
 * - First sync after logging in: the account wins, so a shared device never overwrites
 *   someone's account. Local data is only uploaded when the account has none yet.
 * - Afterwards: last write wins.
 */
export function decide(local: { stamp: number; hasValue: boolean }, server: SyncItem | undefined, firstSync: boolean): SyncDecision {
  if (firstSync) return server ? 'pull' : local.hasValue ? 'push' : 'none';
  if (!server) return local.stamp > 0 && local.hasValue ? 'push' : 'none';
  if (server.updatedAt > local.stamp) return 'pull';
  if (local.stamp > server.updatedAt) return 'push';
  return 'none';
}

type Log = { coachId: string; dayIndex: number; finishedAt: number };
const logId = (l: Log) => `${l.coachId}|${l.dayIndex}|${l.finishedAt}`;

/** Workout history from two devices: keep every workout once, oldest first. */
export function mergeLogs<T extends Log>(a: T[], b: T[]): T[] {
  const seen = new Map<string, T>();
  for (const l of [...a, ...b]) if (l && typeof l.finishedAt === 'number' && !seen.has(logId(l))) seen.set(logId(l), l);
  return [...seen.values()].sort((x, y) => x.finishedAt - y.finishedAt);
}
