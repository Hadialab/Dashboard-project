import { probabilityFor, WON_STAGE, LOST_STAGE, OPEN_STAGES } from "./crmConstants";
import type { Customer, Lead, Deal, Money } from "../types";

/**
 * The numbers behind the dashboard and the reports page.
 *
 * Pure functions over plain data: no fetching, no React, no formatting. That is
 * deliberate — it is what makes them worth unit testing, and there are 37 tests
 * on this file because revenue maths that is subtly wrong is worse than revenue
 * maths that is absent.
 *
 * Every aggregation coerces with Number(). A NUMERIC column comes back from pg as
 * a string, and `sum + "100"` concatenates: two deals worth 100 and 250.5 summed
 * to "0100250.5". This has been caught three times in three different functions.
 */

export type SummaryMetrics = {
  totalCustomers: number;
  totalLeads: number;
  totalDeals: number;
  totalRevenue: number;
  averageDealValue: number;
  /**
   * Deals over leads.
   *
   * Inconsistently typed on purpose — the empty case returns the number 0 and the
   * populated case a string from toFixed(1). Pinned by a test rather than
   * silently changed, because something may already be rendering it.
   */
  leadConversionRate: number | string;
};

export type RevenueTrendPoint = {
  month: string;
  revenue: number;
  deals: number;
};

export type StageCount = { stage: string; count: number };

/** The same shape as StageCount, but keyed by a lead's status rather than a stage. */
export type StatusCount = { status: string; count: number };

export type FunnelRow = {
  stage: string;
  count: number;
  value: number;
  /**
   * A percentage, reported only where it means something: the next stage holds no
   * more deals than this one. `null` otherwise. See the note on getStageFunnel.
   */
  dropOff: number | null;
  /** The raw difference in deal count against the previous stage. Always present. */
  change: number;
  /** True when the next stage holds more deals, i.e. pipeline is flowing forward. */
  grew: boolean;
};

export type RevenueForecast = {
  openCount: number;
  openValue: number;
  weighted: number;
  wonValue: number;
  /** `null` rather than 0% when nothing has closed — an open deal has no outcome. */
  winRate: number | null;
};

export type OwnerPerformance = {
  owner: string;
  deals: number;
  value: number;
  won: number;
  lost: number;
  open: number;
  winRate: number | null;
  average: number;
};

// ===== Overview =====

export const getSummaryMetrics = (
  customers: Customer[] = [],
  leads: Lead[] = [],
  deals: Deal[] = [],
): SummaryMetrics => {
  const totalDeals = deals.length;

  const totalRevenue = deals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);

  const averageDealValue = totalDeals === 0 ? 0 : totalRevenue / totalDeals;

  const leadConversionRate =
    leads.length === 0 ? 0 : ((totalDeals / leads.length) * 100).toFixed(1);

  return {
    totalCustomers: customers.length,
    totalLeads: leads.length,
    totalDeals,
    totalRevenue,
    averageDealValue,
    leadConversionRate,
  };
};

export const getRevenueTrend = (deals: Deal[] = []): RevenueTrendPoint[] => {
  const months = new Map<string, RevenueTrendPoint>();

  for (const deal of deals) {
    if (!deal.expectedClose) continue;

    const month = deal.expectedClose.slice(0, 7);
    const existing = months.get(month) ?? { month, revenue: 0, deals: 0 };

    // Coerced because `+=` on a string concatenates.
    existing.revenue += Number(deal.value ?? 0);
    existing.deals += 1;
    months.set(month, existing);
  }

  return [...months.values()];
};

export const getDealsByStage = (deals: Deal[] = []): StageCount[] => {
  const stages = new Map<string, number>();

  for (const deal of deals) {
    stages.set(deal.stage, (stages.get(deal.stage) ?? 0) + 1);
  }

  return [...stages].map(([stage, count]) => ({ stage, count }));
};

export const getLeadsByStatus = (leads: Lead[] = []): StatusCount[] => {
  const statuses = new Map<string, number>();

  for (const lead of leads) {
    statuses.set(lead.status, (statuses.get(lead.status) ?? 0) + 1);
  }

  return [...statuses].map(([status, count]) => ({ status, count }));
};

/** The ten deals closing furthest out — the "recent deals" table's source. */
export const getRecentDeals = (deals: Deal[] = [], limit = 10): Deal[] =>
  [...deals]
    .filter((deal) => Boolean(deal.expectedClose))
    .sort((a, b) => new Date(b.expectedClose!).getTime() - new Date(a.expectedClose!).getTime())
    .slice(0, limit);

/** Revenue per customer name, highest first. */
export const getTopCustomers = (deals: Deal[] = []) => {
  const revenue = new Map<string, number>();

  for (const deal of deals) {
    revenue.set(deal.customer, (revenue.get(deal.customer) ?? 0) + Number(deal.value ?? 0));
  }

  return [...revenue]
    .map(([customer, revenue]) => ({ customer, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
};

// ===== Pipeline analysis =====

// The stages a deal moves through, in order. Won is last; Lost is deliberately
// absent — it is not a rung on the ladder, it is the way off it.
const FUNNEL_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won"] as const;

const isClosedStage = (stage: string): boolean => stage === WON_STAGE || stage === LOST_STAGE;

const closedCount = (deals: Deal[]): number => deals.filter((d) => isClosedStage(d.stage)).length;

/**
 * Deal count at each stage, plus what changed between one stage and the next.
 *
 * An honesty note, because "funnel" implies more than this delivers: these are
 * deals sitting at each stage *now*, not deals that reached it. A deal that got
 * to Negotiation and then went back to Proposal has not un-reached Negotiation,
 * but it is counted under Proposal. Without a stage history — which the app does
 * not record — a true cumulative funnel cannot be built.
 *
 * That has a direct consequence for the drop-off figure. A later stage routinely
 * holds MORE deals than an earlier one, because new deals keep entering at Lead
 * and working forward. Subtracting adjacent counts would then report a
 * "-100% drop-off", which is not a thing a funnel can do. So:
 *
 *   dropOff — a percentage, reported only where it means something: the next
 *             stage holds no more deals than this one. `null` otherwise.
 *   change  — the raw difference in deal count, always present.
 *   grew    — true when the next stage holds more deals.
 *
 * IMPORTANT for anything rendering this: `change`, `dropOff` and `grew` describe
 * the movement INTO that row, so the transition from row[i-1] to row[i] is
 * described by row[i]. Reading row[i]'s own numbers for the `row[i] → row[i+1]`
 * transition shifts every figure one stage along, which is a bug this file was
 * bitten by once already.
 */
export const getStageFunnel = (deals: Deal[] = []): FunnelRow[] => {
  const at = (stage: string) => deals.filter((deal) => deal.stage === stage);

  // The callback's return type is stated because `rows: FunnelRow[]` annotates the
  // result of the whole expression, not this object literal. Without it `dropOff:
  // null` has nothing to be checked against and infers as an implicit any.
  const rows: FunnelRow[] = FUNNEL_STAGES.map((stage): FunnelRow => {
    const matching = at(stage);

    return {
      stage,
      count: matching.length,
      value: matching.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0),
      dropOff: null,
      change: 0,
      grew: false,
    };
  });

  return rows.map((row, index) => {
    if (index === 0) return row;

    const previous = rows[index - 1].count;
    const change = row.count - previous;

    // Nothing to drop off from, or the next stage holds more deals than this
    // one. Either way a percentage here would misstate what happened.
    if (previous === 0 || change > 0) {
      return { ...row, change, grew: change > 0 };
    }

    return { ...row, change, dropOff: Math.round((-change / previous) * 100) };
  });
};

/**
 * Weighted revenue forecast for open pipeline.
 *
 * Each stage carries a probability — see STAGE_PROBABILITY in crmConstants, the
 * one place they are defined — and a deal contributes value × probability. Lost
 * deals contribute nothing; Won deals are reported separately as closed rather
 * than forecast. A stage with no configured probability contributes nothing
 * rather than a guess.
 */
export const getRevenueForecast = (deals: Deal[] = []): RevenueForecast => {
  const open = deals.filter((deal) => !isClosedStage(deal.stage));

  const openValue = open.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);

  const weighted = open.reduce(
    (sum, deal) => sum + Number(deal.value ?? 0) * probabilityFor(deal.stage),
    0,
  );

  const won = deals.filter((deal) => deal.stage === WON_STAGE);

  return {
    openCount: open.length,
    openValue,
    weighted,
    wonValue: won.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0),
    // Only deals that have actually closed count towards a win rate. A deal still
    // in Negotiation has neither been won nor lost.
    winRate:
      closedCount(deals) === 0 ? null : Math.round((won.length / closedCount(deals)) * 100),
  };
};

/**
 * Per-owner performance: how many deals, what they are worth, how often they win.
 *
 * Grouped by the owner display name rather than ownerId, because that is what a
 * deal stores and what survives its owner being removed. An unowned deal still
 * needs to appear — unassigned pipeline is real pipeline, and dropping it would
 * quietly understate the totals.
 */
export const getPerformanceByOwner = (deals: Deal[] = []): OwnerPerformance[] => {
  const byOwner = new Map<string, Omit<OwnerPerformance, "winRate" | "average">>();

  for (const deal of deals) {
    const owner = deal.owner || "Unassigned";

    const row = byOwner.get(owner) ?? {
      owner,
      deals: 0,
      value: 0,
      won: 0,
      lost: 0,
      open: 0,
    };

    row.deals += 1;
    row.value += Number(deal.value ?? 0);

    if (deal.stage === WON_STAGE) row.won += 1;
    else if (deal.stage === LOST_STAGE) row.lost += 1;
    else row.open += 1;

    byOwner.set(owner, row);
  }

  return [...byOwner.values()]
    .map((row) => {
      const closed = row.won + row.lost;

      return {
        ...row,
        // No closed deals means no rate to report, rather than a misleading 0%.
        winRate: closed === 0 ? null : Math.round((row.won / closed) * 100),
        average: row.deals === 0 ? 0 : row.value / row.deals,
      };
    })
    .sort((a, b) => b.value - a.value);
};

/** Re-exported so a caller can filter on openness without importing two modules. */
export { OPEN_STAGES };
export type { Money };
