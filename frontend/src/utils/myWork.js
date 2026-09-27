import { CONVERTED_STATUS, OPEN_STAGES } from "./crmConstants";
import { daysUntil, daysSince } from "./time";

// "My Work" — the numbers a salesperson actually acts on.
//
// Two thresholds live here rather than being inlined in the widget, because
// "what counts as closing soon" and "what counts as neglected" are business
// judgements, not UI details. Change them in one place and the widget, the
// notification check in Feature 7 and anything else stay in agreement.

/** A deal closing inside this many days counts as "closing soon". */
export const CLOSING_SOON_DAYS = 7;

/**
 * A lead untouched for this many days counts as neglected.
 *
 * 14 rather than 7: a week is normal for a lead still being worked, so a 7-day
 * rule buries the list in leads that are merely progressing.
 */
export const STALE_LEAD_DAYS = 14;

/** Statuses a lead can be left in once it is no longer worth chasing. */
const CLOSED_LEAD_STATUSES = [CONVERTED_STATUS, "Lost"];

/**
 * Whether a record belongs to the signed-in user.
 *
 * Matched on ownerId rather than the display name. Names are not unique — two
 * people called Sarah would each see the other's pipeline — and the server
 * already derives the name from the id, so the id is the only reliable link.
 */
export function isMine(record, user) {
  if (!user?.id) return false;
  return record?.ownerId === user.id;
}

/**
 * Open deals due to close within `days`, soonest first.
 *
 * Overdue deals are included and sorted first: a deal that should have closed
 * last week is more urgent than one due in six days, not less.
 */
export function getClosingSoon(deals = [], days = CLOSING_SOON_DAYS, options = {}) {
  const now = options.now ?? Date.now();

  return deals
    .filter((deal) => OPEN_STAGES.includes(deal.stage))
    .filter((deal) => {
      const remaining = daysUntil(deal.expectedClose, { now });
      // A deal with no close date cannot be "closing soon", and null would
      // otherwise compare as 0 and sweep in every undated deal.
      if (remaining === null) return false;
      return remaining <= days;
    })
    .sort((a, b) => daysUntil(a.expectedClose, { now }) - daysUntil(b.expectedClose, { now }));
}

/**
 * Leads that have not been touched recently and are still worth chasing.
 *
 * Measured from updatedAt rather than createdDate: a three-month-old lead that
 * was called yesterday is not neglected, and one created last week that nobody
 * has touched is.
 */
export function getStaleLeads(leads = [], days = STALE_LEAD_DAYS, options = {}) {
  const now = options.now ?? Date.now();

  return leads
    .filter((lead) => !CLOSED_LEAD_STATUSES.includes(lead.status))
    .filter((lead) => {
      // Falls back to createdDate for a lead with no updatedAt, so an old record
      // is still surfaced rather than silently treated as fresh.
      const reference = lead.updatedAt ?? lead.createdDate;
      const age = daysSince(reference, { now });
      return age !== null && age >= days;
    })
    .sort((a, b) => daysSince(b.updatedAt ?? b.createdDate) - daysSince(a.updatedAt ?? a.createdDate));
}

/** Today's follow-up-shaped work: what is closing, and what is being neglected. */
export function getMyWork({ deals = [], leads = [], user, closingSoonDays, staleLeadDays }) {
  const scopedDeals = user ? deals.filter((deal) => isMine(deal, user)) : deals;
  const scopedLeads = user ? leads.filter((lead) => isMine(lead, user)) : leads;

  return {
    closingSoon: getClosingSoon(scopedDeals, closingSoonDays ?? CLOSING_SOON_DAYS),
    staleLeads: getStaleLeads(scopedLeads, staleLeadDays ?? STALE_LEAD_DAYS),
  };
}

/** Sum of the open value in a list, for the widget's headline figure. */
export function totalValue(deals = []) {
  return deals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);
}
