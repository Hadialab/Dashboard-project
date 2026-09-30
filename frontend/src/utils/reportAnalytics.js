import { probabilityFor, WON_STAGE, LOST_STAGE } from "./crmConstants";

export const getSummaryMetrics = (customers = [], leads = [], deals = []) => {
  const totalCustomers = customers.length;
  const totalLeads = leads.length;
  const totalDeals = deals.length;

  // Number() because a NUMERIC column arrives from pg as a string, and `sum +
  // "100"` concatenates: two deals worth 100 and 250.5 summed to "0100250.5".
  // The other aggregations in this file already coerced; these two did not.
  const totalRevenue = deals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);

  const averageDealValue =
    totalDeals === 0 ? 0 : totalRevenue / totalDeals;

  const leadConversionRate =
    totalLeads === 0
      ? 0
      : ((totalDeals / totalLeads) * 100).toFixed(1);

  return {
    totalCustomers,
    totalLeads,
    totalDeals,
    totalRevenue,
    averageDealValue,
    leadConversionRate,
  };
};

export const getRevenueTrend = (deals = []) => {
  const months = {};

  deals.forEach((deal) => {
    const month = deal.expectedClose.slice(0, 7);

    if (!months[month]) {
      months[month] = {
        month,
        revenue: 0,
        deals: 0,
      };
    }

    // Coerced for the same reason as in getSummaryMetrics: a NUMERIC column
    // arrives as a string, and `+=` on a string concatenates.
    months[month].revenue += Number(deal.value ?? 0);
    months[month].deals += 1;
  });

  return Object.values(months);
};

export const getDealsByStage = (deals = []) => {
  const stages = {};

  deals.forEach((deal) => {
    stages[deal.stage] = (stages[deal.stage] || 0) + 1;
  });

  return Object.entries(stages).map(([stage, count]) => ({
    stage,
    count,
  }));
};

export const getLeadsByStatus = (leads = []) => {
  const statuses = {};

  leads.forEach((lead) => {
    statuses[lead.status] = (statuses[lead.status] || 0) + 1;
  });

  return Object.entries(statuses).map(([status, count]) => ({
    status,
    count,
  }));
};

export const getRecentDeals = (deals = []) => {
  return [...deals]
    .sort(
      (a, b) =>
        new Date(b.expectedClose) - new Date(a.expectedClose)
    )
    .slice(0, 10);
};

export const getTopCustomers = (deals = []) => {
  const revenueMap = {};

  deals.forEach((deal) => {
    revenueMap[deal.customer] =
      (revenueMap[deal.customer] || 0) + deal.value;
  });

  return Object.entries(revenueMap)
    .map(([customer, revenue]) => ({
      customer,
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

// ===== Pipeline analysis =====

// The stages a deal moves through, in order. Won is last; Lost is deliberately
// absent — it is not a rung on the ladder, it is the way off it.
const FUNNEL_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won"];

const isClosedStage = (stage) => stage === WON_STAGE || stage === LOST_STAGE;

const closedCount = (deals) => deals.filter((d) => isClosedStage(d.stage)).length;

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
 *   grew    — true when the next stage holds more deals, i.e. pipeline is
 *             flowing forward rather than leaking.
 */
export const getStageFunnel = (deals = []) => {
  const at = (stage) => deals.filter((deal) => deal.stage === stage);

  const rows = FUNNEL_STAGES.map((stage) => {
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
export const getRevenueForecast = (deals = []) => {
  const open = deals.filter((deal) => !isClosedStage(deal.stage));

  const openValue = open.reduce(
    (sum, deal) => sum + Number(deal.value ?? 0),
    0,
  );

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
    // Only deals that have actually closed count towards a win rate. A deal
    // still in Negotiation has neither been won nor lost.
    winRate:
      closedCount(deals) === 0
        ? null
        : Math.round((won.length / closedCount(deals)) * 100),
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
export const getPerformanceByOwner = (deals = []) => {
  const byOwner = new Map();

  for (const deal of deals) {
    const owner = deal.owner || "Unassigned";

    if (!byOwner.has(owner)) {
      byOwner.set(owner, {
        owner,
        deals: 0,
        value: 0,
        won: 0,
        lost: 0,
        open: 0,
      });
    }

    const row = byOwner.get(owner);
    row.deals += 1;
    row.value += Number(deal.value ?? 0);

    if (deal.stage === WON_STAGE) row.won += 1;
    else if (deal.stage === LOST_STAGE) row.lost += 1;
    else row.open += 1;
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