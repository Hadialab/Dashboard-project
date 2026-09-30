import { describe, it, expect } from "vitest";

import {
  CLOSING_SOON_DAYS,
  STALE_LEAD_DAYS,
  isMine,
  getClosingSoon,
  getStaleLeads,
  getMyWork,
  totalValue,
} from "../utils/myWork";
import { toDate } from "../utils/time";

// A fixed clock. Every threshold here is relative to "now", so a test that used
// the real clock would pass today and fail next month.
const NOW = new Date("2026-09-30T12:00:00Z").getTime();
const DAY = 86_400_000;
const iso = (offsetDays) => new Date(NOW + offsetDays * DAY).toISOString().slice(0, 10);

const user = { id: "u1", name: "Rep One" };

const deal = (over = {}) => ({
  id: "d",
  title: "Deal",
  ownerId: "u1",
  stage: "Lead",
  value: 1000,
  expectedClose: iso(0),
  ...over,
});

const lead = (over = {}) => ({
  id: "l",
  name: "Lead",
  ownerId: "u1",
  status: "New",
  createdDate: iso(-30),
  ...over,
});

describe("thresholds", () => {
  it("keeps both business judgements in one place", () => {
    expect(CLOSING_SOON_DAYS).toBe(7);
    expect(STALE_LEAD_DAYS).toBe(14);
  });
});

describe("isMine", () => {
  it("matches on ownerId, not on the display name", () => {
    // Two people can share a name; only the id is a reliable link.
    expect(isMine({ ownerId: "u1" }, user)).toBe(true);
    expect(isMine({ ownerId: "u1", owner: "Someone Else" }, user)).toBe(true);
  });

  it("does not match a different user who happens to share the name", () => {
    const other = { id: "u2", name: "Rep One" };

    expect(isMine({ ownerId: "u1", owner: "Rep One" }, other)).toBe(false);
  });

  it("is false with no user or no owner", () => {
    expect(isMine({ ownerId: "u1" }, null)).toBe(false);
    expect(isMine({ ownerId: "u1" }, {})).toBe(false);
    expect(isMine({}, user)).toBe(false);
    expect(isMine(null, user)).toBe(false);
  });
});

describe("getClosingSoon", () => {
  it("includes a deal closing today", () => {
    const found = getClosingSoon([deal()], CLOSING_SOON_DAYS, { now: NOW });

    expect(found).toHaveLength(1);
  });

  it("includes an overdue deal and sorts it first", () => {
    const found = getClosingSoon(
      [deal({ id: "soon", expectedClose: iso(3) }), deal({ id: "late", expectedClose: iso(-2) })],
      CLOSING_SOON_DAYS,
      { now: NOW },
    );

    expect(found.map((d) => d.id)).toEqual(["late", "soon"]);
  });

  it("excludes a deal beyond the window", () => {
    expect(getClosingSoon([deal({ expectedClose: iso(30) })], CLOSING_SOON_DAYS, { now: NOW })).toHaveLength(0);
  });

  it("excludes won and lost deals, which are no longer closing", () => {
    const deals = [
      deal({ id: "won", stage: "Won", expectedClose: iso(1) }),
      deal({ id: "lost", stage: "Lost", expectedClose: iso(1) }),
    ];

    expect(getClosingSoon(deals, CLOSING_SOON_DAYS, { now: NOW })).toHaveLength(0);
  });

  it("excludes a deal with no close date rather than treating it as due today", () => {
    // null would otherwise compare as 0 and sweep in every undated deal.
    expect(getClosingSoon([deal({ expectedClose: null })], CLOSING_SOON_DAYS, { now: NOW })).toHaveLength(0);
    expect(getClosingSoon([deal({ expectedClose: "" })], CLOSING_SOON_DAYS, { now: NOW })).toHaveLength(0);
  });

  it("honours a caller-supplied window", () => {
    const deals = [deal({ id: "far", expectedClose: iso(20) })];

    expect(getClosingSoon(deals, 7, { now: NOW })).toHaveLength(0);
    expect(getClosingSoon(deals, 30, { now: NOW })).toHaveLength(1);
  });

  it("does not mutate the input", () => {
    const deals = [deal({ id: "b", expectedClose: iso(5) }), deal({ id: "a", expectedClose: iso(-1) })];

    getClosingSoon(deals, CLOSING_SOON_DAYS, { now: NOW });
    expect(deals.map((d) => d.id)).toEqual(["b", "a"]);
  });
});

describe("getStaleLeads", () => {
  it("includes a lead untouched for longer than the threshold", () => {
    const found = getStaleLeads([lead({ updatedAt: iso(-20) })], STALE_LEAD_DAYS, { now: NOW });

    expect(found).toHaveLength(1);
  });

  it("excludes a lead touched recently, however old it was created", () => {
    // A three-month-old lead called yesterday is not neglected.
    const found = getStaleLeads([lead({ createdDate: iso(-90), updatedAt: iso(-1) })], STALE_LEAD_DAYS, { now: NOW });

    expect(found).toHaveLength(0);
  });

  it("falls back to createdDate when there is no updatedAt", () => {
    const found = getStaleLeads([lead({ createdDate: iso(-30) })], STALE_LEAD_DAYS, { now: NOW });

    expect(found).toHaveLength(1);
  });

  it("excludes converted and lost leads", () => {
    const leads = [
      lead({ id: "c", status: "Converted", updatedAt: iso(-90) }),
      lead({ id: "l", status: "Lost", updatedAt: iso(-90) }),
    ];

    expect(getStaleLeads(leads, STALE_LEAD_DAYS, { now: NOW })).toHaveLength(0);
  });

  it("sorts the most neglected first", () => {
    const leads = [
      lead({ id: "recent", updatedAt: iso(-20) }),
      lead({ id: "oldest", updatedAt: iso(-100) }),
      lead({ id: "middle", updatedAt: iso(-50) }),
    ];

    expect(getStaleLeads(leads, STALE_LEAD_DAYS, { now: NOW }).map((l) => l.id)).toEqual([
      "oldest",
      "middle",
      "recent",
    ]);
  });

  it("ignores a lead with no usable date at all", () => {
    expect(getStaleLeads([{ id: "x", status: "New" }], STALE_LEAD_DAYS, { now: NOW })).toHaveLength(0);
  });
});

describe("getMyWork", () => {
  it("scopes to the signed-in user when one is given", () => {
    const deals = [deal({ id: "mine" }), deal({ id: "theirs", ownerId: "u2" })];
    const leads = [lead({ id: "mine" }), lead({ id: "theirs", ownerId: "u2" })];

    const result = getMyWork({ deals, leads, user, closingSoonDays: 7, staleLeadDays: 14 });

    expect(result.closingSoon.map((d) => d.id)).toEqual(["mine"]);
    expect(result.staleLeads.map((l) => l.id)).toEqual(["mine"]);
  });

  it("returns everything when there is no user, rather than nothing", () => {
    const deals = [deal({ id: "a" }), deal({ id: "b", ownerId: "u2" })];

    expect(getMyWork({ deals, leads: [], user: null }).closingSoon).toHaveLength(2);
  });

  it("applies the default thresholds when none are passed", () => {
    // getMyWork has no `now` option and reads the real clock, so the dates here
    // are relative to the real today rather than to NOW. Five days out falls
    // inside the seven-day default; eight days does not.
    const realToday = new Date();
    const offset = (days) =>
      new Date(realToday.getTime() + days * 86_400_000).toISOString().slice(0, 10);

    const deals = [deal({ id: "inside", expectedClose: offset(5) }), deal({ id: "outside", expectedClose: offset(8) })];

    const result = getMyWork({ deals, leads: [], user: null });

    expect(result.closingSoon.map((d) => d.id)).toEqual(["inside"]);
  });

  it("returns empty lists rather than undefined for a new account", () => {
    expect(getMyWork({})).toEqual({ closingSoon: [], staleLeads: [] });
  });
});

describe("totalValue", () => {
  it("sums deal values", () => {
    expect(totalValue([deal({ value: 100 }), deal({ value: 250 })])).toBe(350);
  });

  it("coerces a stringified NUMERIC rather than concatenating", () => {
    expect(totalValue([deal({ value: "100" }), deal({ value: "250.5" })])).toBe(350.5);
  });

  it("treats a missing value as zero", () => {
    expect(totalValue([deal({ value: null }), deal({ value: 100 })])).toBe(100);
  });

  it("is zero for an empty list", () => {
    expect(totalValue([])).toBe(0);
  });
});

describe("toDate (used by the thresholds above)", () => {
  it("reads a bare date as local midnight, not UTC midnight", () => {
    const parsed = toDate("2026-09-30");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(30);
    expect(parsed.getHours()).toBe(0);
  });
});
