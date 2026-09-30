import { describe, it, expect } from "vitest";

import { toDate, formatRelative, formatRelativeShort, daysSince, daysUntil } from "../utils/time";

const NOW = new Date("2026-09-30T12:00:00").getTime();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const at = (ms) => new Date(NOW - ms).toISOString();

describe("toDate", () => {
  it("returns null for nothing usable", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate("")).toBeNull();
    expect(toDate("not a date")).toBeNull();
  });

  it("reads a bare YYYY-MM-DD as local midnight", () => {
    // The reason this exists: new Date("2026-09-30") is UTC midnight, which is
    // the previous day for anyone west of Greenwich. pg builds DATE at local
    // midnight, so parsing it as UTC shifted every date back a day.
    const parsed = toDate("2026-09-30");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(30);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });

  it("parses a full ISO timestamp", () => {
    expect(toDate("2026-09-30T14:30:00Z")?.getTime()).toBe(Date.parse("2026-09-30T14:30:00Z"));
  });
});

describe("formatRelative", () => {
  const fmt = (value) => formatRelative(value, { now: NOW });

  it("says 'just now' for the last minute", () => {
    expect(fmt(at(0))).toBe("just now");
    expect(fmt(at(30_000))).toBe("just now");
    expect(fmt(at(MINUTE - 1))).toBe("just now");
  });

  it("counts minutes, and singularises one", () => {
    expect(fmt(at(MINUTE))).toBe("1 minute ago");
    expect(fmt(at(5 * MINUTE))).toBe("5 minutes ago");
  });

  it("counts hours", () => {
    expect(fmt(at(HOUR))).toBe("1 hour ago");
    expect(fmt(at(5 * HOUR))).toBe("5 hours ago");
  });

  it("counts days", () => {
    expect(fmt(at(DAY))).toBe("1 day ago");
    expect(fmt(at(6 * DAY))).toBe("6 days ago");
  });

  it("switches to an absolute date once relative stops being useful", () => {
    const result = fmt(at(3 * WEEK));

    expect(result).not.toMatch(/ago/);
    expect(result).toContain("2026");
  });

  it("treats a future timestamp as 'just now', not 'in 0 minutes'", () => {
    // Clock skew or a bad date, not something that happened.
    expect(formatRelative(new Date(NOW + 5 * HOUR).toISOString(), { now: NOW })).toBe("just now");
  });

  it("returns an em dash rather than 'Invalid Date' for nothing", () => {
    expect(fmt(null)).toBe("—");
    expect(fmt("garbage")).toBe("—");
  });
});

describe("formatRelativeShort", () => {
  const fmt = (value) => formatRelativeShort(value, { now: NOW });

  it("uses the terse forms used in dense table cells", () => {
    expect(fmt(at(0))).toBe("now");
    expect(fmt(at(5 * MINUTE))).toBe("5m");
    expect(fmt(at(3 * HOUR))).toBe("3h");
    expect(fmt(at(2 * DAY))).toBe("2d");
  });

  it("falls back to a short absolute date after a week", () => {
    const result = fmt(at(2 * WEEK));

    expect(result).not.toMatch(/^\d+[mhd]$/);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it("returns an em dash for nothing", () => {
    expect(fmt(null)).toBe("—");
  });
});

describe("daysSince", () => {
  it("compares calendar days, so today is 0 rather than a fraction", () => {
    expect(daysSince("2026-09-30", { now: NOW })).toBe(0);
  });

  it("counts whole days in the past", () => {
    expect(daysSince("2026-09-28", { now: NOW })).toBe(2);
    expect(daysSince("2026-09-23", { now: NOW })).toBe(7);
  });

  it("is negative for a future date", () => {
    expect(daysSince("2026-10-02", { now: NOW })).toBe(-2);
  });

  it("returns null for nothing", () => {
    expect(daysSince(null, { now: NOW })).toBeNull();
    expect(daysSince("nope", { now: NOW })).toBeNull();
  });
});

describe("daysUntil", () => {
  it("is the inverse of daysSince", () => {
    expect(daysUntil("2026-10-02", { now: NOW })).toBe(2);
    expect(daysUntil("2026-09-28", { now: NOW })).toBe(-2);
  });

  it("returns null for nothing, rather than 0", () => {
    // 0 would read as "due today" for a lead with no date at all.
    expect(daysUntil(null, { now: NOW })).toBeNull();
  });
});
