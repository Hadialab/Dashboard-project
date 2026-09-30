import { CONVERTED_STATUS, OPEN_STAGES } from "./crmConstants";
import { daysUntil, daysSince } from "./time";
import type { DateOptions } from "./time";
import type { Deal, Lead, User } from "../types";

// "My Work" — the numbers a salesperson actually acts on.
//
// Two thresholds live here rather than being inlined in the widget, because
// "what counts as closing soon" and "what counts as neglected" are business
// judgements, not UI details. Change them in one place and the widget, the
// notification check and anything else stay in agreement.

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

/** Anything with an owner, for the "is this mine" check. */
type Owned = { ownerId?: string | null };

/**
 * Whether a record belongs to the signed-in user.
 *
 * Matched on ownerId rather than the display name. Names are not unique — two
 * people called Sarah would each see the other's pipeline — and the server
 * already derives the name from the id, so the id is the only reliable link.
 */
export function isMine(record: Owned | null | undefined, user: Partial<User> | null | undefined): boolean {
  if (!user?.id) return false;
  return record?.ownerId === user.id;
}

/**
 * Open deals due to close within `days`, soonest first.
 *
 * Overdue deals are included and sorted first: a deal that should have closed
 * last week is more urgent than one due in six days, not less.
 */
export function getClosingSoon(
  deals: Deal[] = [],
  days: number = CLOSING_SOON_DAYS,
  options: DateOptions = {},
): Deal[] {
  const { now = Date.now() } = options;

  return deals
    .filter((deal) => OPEN_STAGES.includes(deal.stage as never))
    .filter((deal) => {
      const remaining = daysUntil(deal.expectedClose, { now });
      // A deal with no close date cannot be "closing soon", and null would
      // otherwise compare as 0 and sweep in every undated deal.
      if (remaining === null) return false;
      return remaining <= days;
    })
    .sort(
      (a, b) => (daysUntil(a.expectedClose, { now }) ?? 0) - (daysUntil(b.expectedClose, { now }) ?? 0),
    );
}

/**
 * Leads that have not been touched recently and are still worth chasing.
 *
 * Measured from updatedAt rather than createdDate: a three-month-old lead that
 * was called yesterday is not neglected, and one created last week that nobody
 * has touched is.
 */
export function getStaleLeads(
  leads: Lead[] = [],
  days: number = STALE_LEAD_DAYS,
  options: DateOptions = {},
): Lead[] {
  const { now = Date.now() } = options;

  const ageOf = (lead: Lead): number | null => {
    // Falls back to createdDate for a lead with no updatedAt, so an old record
    // is still surfaced rather than silently treated as fresh.
    return daysSince(lead.updatedAt ?? lead.createdDate, { now });
  };

  return leads
    .filter((lead) => !CLOSED_LEAD_STATUSES.includes(lead.status))
    .filter((lead) => {
      const age = ageOf(lead);
      return age !== null && age >= days;
    })
    .sort((a, b) => (ageOf(b) ?? 0) - (ageOf(a) ?? 0));
}

export type MyWork = {
  closingSoon: Deal[];
  staleLeads: Lead[];
};

export type MyWorkInput = {
  deals?: Deal[];
  leads?: Lead[];
  user?: Partial<User> | null;
  closingSoonDays?: number;
  staleLeadDays?: number;
};

/**
 * Today's follow-up-shaped work: what is closing, and what is being neglected.
 *
 * Scoped to the user when one is given, and to everything when not — a
 * dashboard with no signed-in user is a legitimate state, not an empty one.
 *
 * Note there is no `now` option here. The underlying filters take one, but
 * getMyWork does not, so it always reads the real clock; a caller that needs a
 * pinned clock should call getClosingSoon and getStaleLeads directly.
 */
export function getMyWork({ deals = [], leads = [], user, closingSoonDays, staleLeadDays }: MyWorkInput = {}): MyWork {
  const scopedDeals = user ? deals.filter((deal) => isMine(deal, user)) : deals;
  const scopedLeads = user ? leads.filter((lead) => isMine(lead, user)) : leads;

  return {
    closingSoon: getClosingSoon(scopedDeals, closingSoonDays ?? CLOSING_SOON_DAYS),
    staleLeads: getStaleLeads(scopedLeads, staleLeadDays ?? STALE_LEAD_DAYS),
  };
}

/** Sum of the open value in a list, for the widget's headline figure. */
export function totalValue(deals: Deal[] = []): number {
  return deals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);
}
