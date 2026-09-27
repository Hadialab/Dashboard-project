// Postgres type conversions.
//
// The subtle one is DATE. The `pg` driver does not hand back a string or a
// plain object — it constructs a JavaScript Date at *local* midnight. For a
// server east of Greenwich (UTC+3), 5 October therefore arrives as
// 2026-10-04T21:00:00Z, and the obvious `toISOString().slice(0, 10)` renders it
// as the 4th. Every due date and close date would silently land one day early.
//
// The fix is to never route a DATE through UTC. Read the local calendar
// components instead, which are exactly the day the user typed.

/** Renders a DATE as YYYY-MM-DD, in the server's own timezone. */
export function toDateString(value) {
  if (value === null || value === undefined) return value;
  if (!(value instanceof Date)) return value;

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * A TIMESTAMPTZ is an absolute instant, so UTC is correct for it and the offset
 * is preserved. Only the milliseconds are dropped, which nothing reads.
 */
export function toTimestampString(value) {
  if (!(value instanceof Date)) return value;
  return value.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** NUMERIC arrives as a string so large money values keep full precision. */
export function toNumber(value) {
  if (value === null || value === undefined) return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
