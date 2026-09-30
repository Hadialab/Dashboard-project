import { describe, it, expect } from "vitest";

import {
  getSummaryMetrics,
  getRevenueTrend,
  getDealsByStage,
  getLeadsByStatus,
  getRecentDeals,
  getTopCustomers,
  getStageFunnel,
  getRevenueForecast,
  getPerformanceByOwner,
} from "../utils/reportAnalytics";

/**
 * The fixtures below are deliberate rather than incidental.
 *
 * Two of these tests exist because of bugs that actually shipped:
 *
 *  - getRevenueTrend and getSummaryMetrics read `reportType`/`amount` off deals
 *    before the API was migrated, so revenue came out as NaN. These assert on
 *    real field names so a rename cannot pass unnoticed again.
 *  - getStageFunnel's drop-off figures were rendered one stage off in the chart,
 *    which made a growing stage report "no change". The funnel tests pin the
 *    exact per-stage numbers, and the growth case is asserted directly.
 *
 * Stage counts are Lead 3 / Qualified 2 / Proposal 1 / Negotiation 1 / Won 2,
 * chosen because it exercises every branch of the drop-off logic: a drop, no
 * change, and a stage that holds MORE than the one before it.
 */

const deals = [
  { id: "d1", title: "Vertex Fleet", customer: "Vertex Logistics", owner: "A Rep", stage: "Lead", value: 14000, expectedClose: "2026-10-03" },
  { id: "d2", title: "Nova Dashboards", customer: "Nova Analytics", owner: "A Rep", stage: "Lead", value: 8500, expectedClose: "2026-10-20" },
  { id: "d3", title: "Kaslik POS", customer: "Kaslik Digital", owner: "B Rep", stage: "Lead", value: 5000, expectedClose: "2026-11-01" },
  { id: "d4", title: "Beirut Rollout", customer: "Beirut Dairy", owner: "A Rep", stage: "Qualified", value: 32000, expectedClose: "2026-10-05" },
  { id: "d5", title: "Ehden POS", customer: "Tyre Seafood", owner: "B Rep", stage: "Qualified", value: 19500, expectedClose: "2026-09-28" },
  { id: "d6", title: "Tyre Export", customer: "Tyre Seafood", owner: "A Rep", stage: "Proposal", value: 47500, expectedClose: "2026-10-01" },
  { id: "d7", title: "Jbeil Charter", customer: "Vertex Logistics", owner: "A Rep", stage: "Negotiation", value: 64000, expectedClose: "2026-10-02" },
  { id: "d8", title: "Zgharta CRM", customer: "Beirut Dairy", owner: "B Rep", stage: "Won", value: 41000, expectedClose: "2026-09-22" },
  { id: "d9", title: "Sin El Fil", customer: "Nova Analytics", owner: "A Rep", stage: "Won", value: 23500, expectedClose: "2026-09-10" },
  { id: "d10", title: "Kfarhbab Quotes", customer: "Vertex Logistics", owner: "A Rep", stage: "Lost", value: 12500, expectedClose: "2026-09-18" },
];

describe("getSummaryMetrics", () => {
  it("totals revenue from deal.value, not a field that does not exist", () => {
    const result = getSummaryMetrics([], [], deals);

    // 14000+8500+5000+32000+19500+47500+64000+41000+23500+12500
    expect(result.totalRevenue).toBe(267500);
    expect(result.totalDeals).toBe(10);
    expect(result.totalCustomers).toBe(0);
    expect(result.totalLeads).toBe(0);
  });

  it("returns a real average rather than NaN on a non-empty list", () => {
    expect(getSummaryMetrics([], [], deals).averageDealValue).toBe(26750);
  });

  it("does not divide by zero on an empty workspace", () => {
    const result = getSummaryMetrics([], [], []);

    expect(result.totalRevenue).toBe(0);
    expect(result.averageDealValue).toBe(0);
    // Known inconsistency, pinned rather than silently changed: the empty case
    // returns the number 0 while the populated case returns a string from
    // toFixed(1). Anything consuming this has to cope with both.
    expect(result.leadConversionRate).toBe(0);
  });

  it("coerces a stringified NUMERIC value, which is what pg returns", () => {
    // NUMERIC columns arrive as strings. Summing them with + concatenates.
    const stringy = [{ value: "100" }, { value: "250.5" }];
    const result = getSummaryMetrics([], [], [{ stage: "Lead", ...stringy[0] }, { stage: "Won", ...stringy[1] }]);

    expect(result.totalRevenue).toBe(350.5);
  });

  it("reports conversion as deals over leads", () => {
    const result = getSummaryMetrics([], [{ id: "l1" }, { id: "l2" }, { id: "l3" }, { id: "l4" }], deals);

    expect(result.leadConversionRate).toBe("250.0");
  });
});

describe("getRevenueTrend", () => {
  it("buckets revenue by the expectedClose month", () => {
    const trend = getRevenueTrend(deals);
    const byMonth = Object.fromEntries(trend.map((row) => [row.month, row]));

    expect(Object.keys(byMonth).sort()).toEqual(["2026-09", "2026-10", "2026-11"]);
    // October holds d1, d2, d4, d6, d7.
    expect(byMonth["2026-10"].revenue).toBe(14000 + 8500 + 32000 + 47500 + 64000);
    expect(byMonth["2026-10"].deals).toBe(5);
    // September holds the four that already closed or lapsed.
    expect(byMonth["2026-09"].deals).toBe(4);
    expect(byMonth["2026-09"].revenue).toBe(19500 + 41000 + 23500 + 12500);
  });

  it("sums stringified values without concatenating them", () => {
    const trend = getRevenueTrend([
      { value: "100", expectedClose: "2026-10-01", stage: "Lead" },
      { value: "200", expectedClose: "2026-10-02", stage: "Lead" },
    ]);

    expect(trend[0].revenue).toBe(300);
  });
});

describe("getDealsByStage", () => {
  it("counts deals per stage", () => {
    const counts = Object.fromEntries(getDealsByStage(deals).map((r) => [r.stage, r.count]));

    expect(counts).toEqual({ Lead: 3, Qualified: 2, Proposal: 1, Negotiation: 1, Won: 2, Lost: 1 });
  });

  it("returns nothing for an empty list", () => {
    expect(getDealsByStage([])).toEqual([]);
  });
});

describe("getLeadsByStatus", () => {
  it("counts leads per status", () => {
    const counts = Object.fromEntries(
      getLeadsByStatus([{ status: "New" }, { status: "New" }, { status: "Converted" }]).map((r) => [r.status, r.count]),
    );

    expect(counts).toEqual({ New: 2, Converted: 1 });
  });
});

describe("getRecentDeals", () => {
  it("sorts by expected close, soonest first, and caps at ten", () => {
    const recent = getRecentDeals(deals);

    expect(recent).toHaveLength(10);
    // Newest close date first, which is what a "recent deals" table wants.
    expect(recent[0].expectedClose).toBe("2026-11-01");
    expect(recent[recent.length - 1].expectedClose).toBe("2026-09-10");
  });

  it("does not mutate the input array", () => {
    const original = [...deals];
    getRecentDeals(deals);
    expect(deals).toEqual(original);
  });

  it("caps a longer list at ten", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `d${i}`,
      expectedClose: `2026-01-${String(i + 1).padStart(2, "0")}`,
    }));

    expect(getRecentDeals(many)).toHaveLength(10);
  });
});

describe("getTopCustomers", () => {
  it("ranks customers by revenue, highest first", () => {
    const top = getTopCustomers(deals);

    // Vertex has three deals and the highest total.
    expect(top[0]).toEqual({ customer: "Vertex Logistics", revenue: 14000 + 64000 + 12500 });
    expect(top.map((r) => r.customer)).toEqual([
      "Vertex Logistics",
      "Beirut Dairy",
      "Tyre Seafood",
      "Nova Analytics",
      "Kaslik Digital",
    ]);
  });
});

describe("getStageFunnel", () => {
  const funnel = getStageFunnel(deals);
  const row = (stage) => funnel.find((r) => r.stage === stage);

  it("counts and values each stage", () => {
    expect(row("Lead").count).toBe(3);
    expect(row("Lead").value).toBe(27500);
    expect(row("Won").count).toBe(2);
    expect(row("Won").value).toBe(64500);
  });

  it("excludes Lost, which is not a rung on the ladder", () => {
    expect(funnel.map((r) => r.stage)).toEqual(["Lead", "Qualified", "Proposal", "Negotiation", "Won"]);
  });

  it("has no drop-off attributed to the first stage", () => {
    expect(row("Lead").dropOff).toBeNull();
    expect(row("Lead").change).toBe(0);
  });

  it("reports drop-off against the stage it moved into", () => {
    // Qualified(2) sits below Lead(3): 1 of 3 fell away.
    expect(row("Qualified").change).toBe(-1);
    expect(row("Qualified").dropOff).toBe(33);

    // Proposal(1) below Qualified(2): 1 of 2.
    expect(row("Proposal").change).toBe(-1);
    expect(row("Proposal").dropOff).toBe(50);
  });

  it("reports no change when two adjacent stages hold the same count", () => {
    // Negotiation(1) below Proposal(1). Compared with === rather than toBe
    // because the arithmetic yields -0, which renders as "0" but is not
    // Object.is-equal to 0.
    expect(row("Negotiation").change === 0).toBe(true);
    expect(row("Negotiation").dropOff === 0).toBe(true);
    expect(row("Negotiation").grew).toBe(false);
  });

  it("flags growth instead of a negative drop-off when a later stage is bigger", () => {
    // Won(2) above Negotiation(1). This is the case that used to render as
    // "no change" in the chart, because the chart read the previous row.
    expect(row("Won").change).toBe(1);
    expect(row("Won").grew).toBe(true);
    expect(row("Won").dropOff).toBeNull();
  });

  it("gives every row a change and a boolean, so a renderer never has to guess", () => {
    for (const r of funnel) {
      expect(typeof r.change).toBe("number");
      expect(typeof r.grew).toBe("boolean");
    }
  });

  it("handles an empty pipeline without dividing by zero", () => {
    const empty = getStageFunnel([]);

    expect(empty.every((r) => r.count === 0)).toBe(true);
    expect(empty.every((r) => r.dropOff === null)).toBe(true);
  });

  it("treats a value of 0 as a number, not as missing", () => {
    const withZero = getStageFunnel([
      { stage: "Lead", value: 0 },
      { stage: "Qualified", value: 0 },
    ]);

    expect(row("Lead")).toBeDefined();
    expect(withZero[0].value).toBe(0);
  });
});

describe("getRevenueForecast", () => {
  const forecast = getRevenueForecast(deals);

  it("weights open pipeline by stage probability", () => {
    // Lead 27500*0.10 + Qualified 51500*0.25 + Proposal 47500*0.50 + Negotiation 64000*0.75
    expect(forecast.weighted).toBe(2750 + 12875 + 23750 + 48000);
  });

  it("counts only open deals toward the forecast", () => {
    expect(forecast.openCount).toBe(7);
    // The three closed deals (2 won, 1 lost) are excluded from open value.
    expect(forecast.openValue).toBe(267500 - 41000 - 23500 - 12500);
  });

  it("reports won separately, since a won deal is closed rather than forecast", () => {
    expect(forecast.wonValue).toBe(64500);
  });

  it("computes win rate from closed deals only", () => {
    // 2 won of 3 closed (2 won + 1 lost). Open deals have neither outcome.
    expect(forecast.winRate).toBe(67);
  });

  it("reports no win rate rather than 0% when nothing has closed", () => {
    const open = getRevenueForecast([{ stage: "Lead", value: 100 }]);
    expect(open.winRate).toBeNull();
  });

  it("contributes nothing for a stage with no configured probability", () => {
    const unknown = getRevenueForecast([{ stage: "Teleported", value: 100000 }]);

    expect(unknown.weighted).toBe(0);
    expect(unknown.openValue).toBe(100000);
  });

  it("is zero for an empty pipeline rather than NaN", () => {
    const empty = getRevenueForecast([]);

    expect(empty.weighted).toBe(0);
    expect(empty.openValue).toBe(0);
    expect(empty.winRate).toBeNull();
  });
});

describe("getPerformanceByOwner", () => {
  const rows = getPerformanceByOwner(deals);
  const forOwner = (name) => rows.find((r) => r.owner === name);

  it("groups by owner and ranks by total value", () => {
    expect(rows.map((r) => r.owner)).toEqual(["A Rep", "B Rep"]);
  });

  it("splits each owner's deals into open, won and lost", () => {
    // A Rep owns d1 d2 d4 d6 d7 d9 d10: five open, one won, one lost.
    expect(forOwner("A Rep")).toMatchObject({ deals: 7, open: 5, won: 1, lost: 1, value: 202000 });
    // B Rep owns d3 d5 d8: two open, one won, none lost.
    expect(forOwner("B Rep")).toMatchObject({ deals: 3, open: 2, won: 1, lost: 0, value: 65500 });
  });

  it("computes a win rate only from closed deals", () => {
    // A Rep closed 2 of 7 deals but only 2 count: 1 won of 2 closed.
    expect(forOwner("A Rep").winRate).toBe(50);
    // B Rep has no lost deal, so every closed deal was a win.
    expect(forOwner("B Rep").winRate).toBe(100);
  });

  it("reports no win rate for an owner with nothing closed", () => {
    const allOpen = getPerformanceByOwner([{ owner: "C Rep", stage: "Lead", value: 500 }]);

    expect(allOpen[0].winRate).toBeNull();
  });

  it("keeps unowned pipeline in its own bucket rather than dropping it", () => {
    const unowned = getPerformanceByOwner([{ stage: "Lead", value: 900 }]);

    expect(unowned).toHaveLength(1);
    expect(unowned[0].owner).toBe("Unassigned");
    expect(unowned[0].value).toBe(900);
  });

  it("computes an average per deal", () => {
    expect(forOwner("B Rep").average).toBe(65500 / 3);
    expect(forOwner("A Rep").average).toBe(202000 / 7);
  });

  it("sums stringified values without concatenating them", () => {
    const stringy = getPerformanceByOwner([
      { owner: "A Rep", stage: "Lead", value: "100" },
      { owner: "A Rep", stage: "Won", value: "200" },
    ]);

    expect(stringy[0].value).toBe(300);
  });
});
