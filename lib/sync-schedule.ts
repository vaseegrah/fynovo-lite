export function isSyncDue(lastSyncAt: Date | null | undefined, intervalMinutes: number | undefined, now: Date = new Date()): boolean {
  if (!lastSyncAt) return true;
  const interval = (intervalMinutes || 1440) * 60_000;
  return now.getTime() - lastSyncAt.getTime() >= interval;
}
