/**
 * Calendar-day arithmetic, shared by everything in the economy that says "day".
 *
 * Three separate rules are specified in calendar days rather than elapsed
 * hours — the efficiency modifier (§3.3), the daily cap (NFR-TASK-2) and the
 * streak (§3.4) — and they must agree on where a day starts or a participant
 * will see their streak tick over at a different moment from their cap reset.
 *
 * "Local" means the server's timezone, which is the study's timezone. The whole
 * cohort is in one place, so a single fixed boundary is honest here; a
 * per-participant timezone would be the right answer for a real product and is
 * deliberately not what this is.
 *
 * Pure arithmetic, no imports.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight at the start of the day `date` falls in. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local midnight at the start of the *next* day — an exclusive upper bound. */
export function startOfNextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/** True when both instants fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/**
 * Whole calendar days from `from` to `to`, counted on local midnights.
 *
 * Calendar days, not 24-hour blocks: a task due Monday and finished at 00:05 on
 * Tuesday is one day late, which is what a participant would say themselves.
 * Negative when `to` precedes `from`.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS,
  );
}

/**
 * #336 — whether a due date carries a time of day. The picker stores a
 * date-only deadline as local midnight (every task created before due times
 * existed is one), so midnight reads as "no time set".
 *
 * ponytail: a deadline of exactly 00:00 is indistinguishable from none; add
 * a `dueTimeSet` column if anyone ever needs a midnight deadline.
 */
export function hasDueTime(dueDate: Date): boolean {
  return dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0;
}

/** The instant a task is actually late: its time, or the end of a date-only day. */
export function deadlineOf(dueDate: Date): Date {
  return hasDueTime(dueDate) ? dueDate : startOfNextDay(dueDate);
}
