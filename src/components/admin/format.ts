/** "3h 12m" for the stat grids — the design's own unit, not raw milliseconds. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/** "21 Sep" — the design's date shorthand for "joined" lines. */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(date);
}

