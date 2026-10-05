// The vocabulary of the CRM, in one place.
//
// These values were previously repeated as literal <option> tags across the
// toolbars, modals and tables, which meant adding a status meant hunting down
// five files and hoping you found them all. The literal lists now live in
// src/types, because those are the type definitions as well as the values, and
// this module derives everything else from them — so a stage is spelled out once
// and there is one place to add another.
//
// The database does not constrain status/stage with a CHECK — a TEXT column with
// a default — so these are a UI-level contract rather than a database one. The
// pipeline board and the reports filter both tolerate unexpected values, so a
// record carrying a stage this file has not heard of still renders.

import { DEAL_STAGES, OPEN_STAGES, LEAD_STATUSES, LEAD_SOURCES, CUSTOMER_STATUSES } from "../types";
import type { DealStage, LeadStatus, Deal } from "../types";

export { DEAL_STAGES, OPEN_STAGES, LEAD_STATUSES, LEAD_SOURCES, CUSTOMER_STATUSES };

/**
 * Whether `value` is one of `options`, narrowing to the union in the true branch.
 *
 * Exists because `OPTION_LIST.includes(value)` cannot do this job: the lists are
 * declared `as const`, so `includes` takes the literal union and rejects any
 * plain `string`. That is correct — it is exactly the mistake this guards
 * against — but it leaves the "is this one of our values?" question unanswerable,
 * which is what a CSV import has to ask about arbitrary text.
 *
 * The cast is confined here and documented rather than sprinkled at call sites.
 */
export function isOneOf<T extends string>(
  options: readonly T[],
  value: string,
): value is T {
  return (options as readonly string[]).includes(value);
}

/**
 * The first real value in `options`, or `fallback` when the list is empty.
 *
 * Present so callers that need a default can do it without a non-null assertion
 * on an index they cannot see is non-empty.
 */
export function firstOr<T>(options: readonly T[], fallback: T): T {
  return options[0] ?? fallback;
}

export const WON_STAGE = "Won" satisfies DealStage;
export const LOST_STAGE = "Lost" satisfies DealStage;
export const CONVERTED_STATUS = "Converted" satisfies LeadStatus;

/**
 * How likely a deal at each stage is to close, used for the revenue forecast.
 *
 * Configurable in one place on purpose: a forecast whose weights are sprinkled
 * through the reports code cannot be adjusted without reading all of it. An
 * unlisted stage falls back to 0, so a new stage never inflates the forecast by
 * accident — it just does not contribute until someone gives it a weight.
 */
export const STAGE_PROBABILITY: Record<string, number> = {
  Lead: 0.1,
  Qualified: 0.25,
  Proposal: 0.5,
  Negotiation: 0.75,
  Won: 1,
  Lost: 0,
};

export function probabilityFor(stage: string): number {
  return STAGE_PROBABILITY[stage] ?? 0;
}

/**
 * The stages to render as board columns: the whole canonical pipeline, in order,
 * plus anything unexpected found in the data appended alphabetically.
 *
 * Empty stages are kept deliberately. A board that hides a stage as soon as it
 * empties has nowhere to drag a deal *into*, which is the main thing a pipeline
 * board is for. An unrecognised stage is still shown, so no deal ends up
 * invisible just because this file has not heard of its stage.
 */
export function boardStages(deals: Deal[] = []): string[] {
  const seen = new Set(deals.map((deal) => deal.stage).filter(Boolean));

  const extra = [...seen].filter((stage) => !DEAL_STAGES.includes(stage as DealStage)).sort();

  return [...DEAL_STAGES, ...extra];
}

// ===== Badge colours =====
//
// Tailwind class strings kept out of the components so a stage looks the same
// everywhere it appears. Each helper falls back to the same neutral grey, which
// is what an unrecognised value gets.

const FALLBACK_BADGE = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

/** Tailwind classes per stage, matching the badges used in the tables and drawer. */
export const STAGE_BADGE: Record<string, string> = {
  Lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Qualified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  Won: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export function stageBadge(stage: string): string {
  return STAGE_BADGE[stage] ?? FALLBACK_BADGE;
}

export const LEAD_STATUS_BADGE: Record<string, string> = {
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Qualified: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Converted: "bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export function leadStatusBadge(status: string): string {
  return LEAD_STATUS_BADGE[status] ?? FALLBACK_BADGE;
}

export const LEAD_SOURCE_BADGE: Record<string, string> = {
  Website: "bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400",
  Referral: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  LinkedIn: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Facebook: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  "Google Ads": "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  "Cold Call": FALLBACK_BADGE,
};

export function leadSourceBadge(source: string): string {
  return LEAD_SOURCE_BADGE[source] ?? FALLBACK_BADGE;
}

export const CUSTOMER_STATUS_BADGE: Record<string, string> = {
  Active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Inactive: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export function customerStatusBadge(status: string): string {
  return CUSTOMER_STATUS_BADGE[status] ?? FALLBACK_BADGE;
}
