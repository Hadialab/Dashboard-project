// Relative time formatting, shared by the activity timeline and the "last
// updated" column in the tables. Kept in one place so the same timestamp never
// reads as "2h ago" in a drawer and "120 minutes ago" in a table.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** The em dash used everywhere a value is missing, rather than "Invalid Date". */
const EM_DASH = "—";

/** Options shared by the date helpers, so a test can pin the clock. */
export type DateOptions = {
  /** Defaults to the real clock. Injectable because every threshold is relative. */
  now?: number;
};

/**
 * Parses anything the API returns for a date, or null if it is unusable.
 *
 * Null rather than an Invalid Date, so a caller cannot do arithmetic on it by
 * accident: `daysUntil(null)` returning 0 would sweep every undated deal into
 * "closing soon".
 */
export function toDate(value: string | number | Date | null | undefined): Date | null {
  if (!value) return null;

  // A bare YYYY-MM-DD is a calendar day, not an instant. Parsing it with
  // new Date() would treat it as UTC midnight and display the previous day for
  // anyone west of Greenwich, so it is read as local midnight instead. pg builds
  // DATE columns at local midnight, so the two have to agree.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * "2 hours ago" for anything recent, an absolute date once relative stops being
 * useful.
 */
export function formatRelative(
  value: string | number | Date | null | undefined,
  { now = Date.now() }: DateOptions = {},
): string {
  const date = toDate(value);
  if (!date) return EM_DASH;

  const diff = now - date.getTime();

  // A timestamp in the future is a clock skew or a bad date, not "in 0 minutes".
  if (diff < 0) return "just now";
  if (diff < MINUTE) return "just now";

  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diff < WEEK) {
    const days = Math.floor(diff / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The terse form used in dense table cells, e.g. "2h", "3d", "12 Mar". */
export function formatRelativeShort(
  value: string | number | Date | null | undefined,
  { now = Date.now() }: DateOptions = {},
): string {
  const date = toDate(value);
  if (!date) return EM_DASH;

  const diff = now - date.getTime();
  if (diff < MINUTE) return "now";
  if (diff < 0) return "now";

  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Whole days between a date and today. Positive is in the past. */
export function daysSince(
  value: string | number | Date | null | undefined,
  { now = Date.now() }: DateOptions = {},
): number | null {
  const date = toDate(value);
  if (!date) return null;

  // Compare calendar days, not elapsed milliseconds, so "today" is 0 rather
  // than 0 until the exact second the record was created.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfValue = new Date(date);
  startOfValue.setHours(0, 0, 0, 0);

  return Math.round((startOfToday.getTime() - startOfValue.getTime()) / DAY);
}

/** Whole days from today to a date. Negative means it has passed. */
export function daysUntil(
  value: string | number | Date | null | undefined,
  { now = Date.now() }: DateOptions = {},
): number | null {
  const elapsed = daysSince(value, { now });
  return elapsed === null ? null : -elapsed;
}
