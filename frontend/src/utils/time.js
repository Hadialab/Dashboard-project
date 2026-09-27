// Relative time formatting, shared by the activity timeline and the "last
// updated" column in the tables. Kept in one place so the same timestamp never
// reads as "2h ago" in a drawer and "120 minutes ago" in a table.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Parses anything the API returns for a date, or null if it is unusable. */
export function toDate(value) {
  if (!value) return null;

  // A bare YYYY-MM-DD is a calendar day, not an instant. Parsing it with
  // new Date() would treat it as UTC midnight and display the previous day for
  // anyone west of Greenwich, so it is read as local midnight instead.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * "2 hours ago" for anything recent, an absolute date once relative stops being
 * useful. Returns an em dash for a missing or unparseable value rather than
 * "Invalid Date".
 */
export function formatRelative(value, { now = Date.now() } = {}) {
  const date = toDate(value);
  if (!date) return "—";

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
export function formatRelativeShort(value, { now = Date.now() } = {}) {
  const date = toDate(value);
  if (!date) return "—";

  const diff = now - date.getTime();
  if (diff < MINUTE) return "now";
  if (diff < 0) return "now";

  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Whole days between a date and today. Positive is in the past. */
export function daysSince(value, { now = Date.now() } = {}) {
  const date = toDate(value);
  if (!date) return null;

  // Compare calendar days, not elapsed milliseconds, so "today" is 0 rather
  // than 0 until the exact second the record was created.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfValue = new Date(date);
  startOfValue.setHours(0, 0, 0, 0);

  return Math.round((startOfToday - startOfValue) / DAY);
}

/** Whole days from today to a date. Negative means it has passed. */
export function daysUntil(value, { now = Date.now() } = {}) {
  const elapsed = daysSince(value, { now });
  return elapsed === null ? null : -elapsed;
}
