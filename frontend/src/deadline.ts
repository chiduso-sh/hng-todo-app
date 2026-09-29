// Turning a "YYYY-MM-DD" string into something a person can read at a glance.

export type DeadlineTone = 'overdue' | 'today' | 'soon' | 'later';

export interface DeadlineInfo {
  label: string;
  tone: DeadlineTone;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Today as "YYYY-MM-DD" in the user's own timezone, for <input type="date">. */
export function todayAsISODate(): string {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/** Whole days from today to the deadline: negative = past, 0 = today. */
function daysUntil(deadline: string): number {
  const target = new Date(`${deadline}T00:00:00`).getTime();
  const today = new Date(`${todayAsISODate()}T00:00:00`).getTime();
  return Math.round((target - today) / MS_PER_DAY);
}

/** Pretty date for the badge, e.g. "3 Oct 2026". */
function formatDate(deadline: string): string {
  return new Date(`${deadline}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * The badge text and colour for one deadline.
 *
 * Returns null when there is no deadline, so the caller can simply skip
 * rendering the badge. TypeScript will not let them forget that case.
 */
export function describeDeadline(deadline: string | null, done: boolean): DeadlineInfo | null {
  if (deadline === null) return null;

  const days = daysUntil(deadline);
  const date = formatDate(deadline);

  // A finished task is never late — it just shows the date it was due.
  if (done) return { label: `Due ${date}`, tone: 'later' };

  if (days < 0) {
    const late = Math.abs(days);
    return { label: `Overdue by ${late} day${late === 1 ? '' : 's'}`, tone: 'overdue' };
  }
  if (days === 0) return { label: 'Due today', tone: 'today' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'soon' };
  if (days <= 7) return { label: `Due in ${days} days`, tone: 'soon' };

  return { label: `Due ${date}`, tone: 'later' };
}
