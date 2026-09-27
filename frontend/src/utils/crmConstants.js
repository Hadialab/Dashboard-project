// The vocabulary of the CRM, in one place.
//
// These values were previously repeated as literal <option> tags across the
// toolbars, modals and tables, which meant adding a status meant hunting down
// five files and hoping you found them all. They are listed here instead.
//
// The database does not constrain status/stage with a CHECK — a TEXT column with
// a default — so these are a UI-level contract rather than a database one. The
// pipeline board and the reports filter both tolerate unexpected values, so a
// record carrying a stage this file does not know about still renders.

/** Deal stages, in pipeline order. The order here is the order on the board. */
export const DEAL_STAGES = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

/** Stages that mean the deal is still live, for forecasting and the board total. */
export const OPEN_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation"];

export const WON_STAGE = "Won";
export const LOST_STAGE = "Lost";

/** Lead statuses. `Converted` is set when a lead becomes a customer. */
export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Converted",
  "Lost",
];

export const CONVERTED_STATUS = "Converted";

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Facebook",
  "Google Ads",
  "Cold Call",
];

export const CUSTOMER_STATUSES = ["Active", "Pending", "Inactive"];

/**
 * How likely a deal at each stage is to close, used for the revenue forecast.
 *
 * Configurable in one place on purpose: a forecast whose weights are sprinkled
 * through the reports code cannot be adjusted without reading all of it. An
 * unlisted stage falls back to 0, so a new stage never inflates the forecast by
 * accident — it just does not contribute until someone gives it a weight.
 */
export const STAGE_PROBABILITY = {
  Lead: 0.1,
  Qualified: 0.25,
  Proposal: 0.5,
  Negotiation: 0.75,
  Won: 1,
  Lost: 0,
};

export function probabilityFor(stage) {
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
export function boardStages(deals = []) {
  const seen = new Set(deals.map((deal) => deal.stage).filter(Boolean));

  const extra = [...seen].filter((stage) => !DEAL_STAGES.includes(stage)).sort();

  return [...DEAL_STAGES, ...extra];
}

/** Tailwind classes per stage, matching the badges used in the tables and drawer. */
export const STAGE_BADGE = {
  Lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Qualified:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Proposal:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Negotiation:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  Won: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export function stageBadge(stage) {
  return STAGE_BADGE[stage] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export const LEAD_STATUS_BADGE = {
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Contacted:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Qualified:
    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Proposal:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Converted:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export function leadStatusBadge(status) {
  return (
    LEAD_STATUS_BADGE[status] ??
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  );
}

export const LEAD_SOURCE_BADGE = {
  Website: "bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400",
  Referral:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  LinkedIn: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Facebook:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  "Google Ads":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  "Cold Call": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function leadSourceBadge(source) {
  return (
    LEAD_SOURCE_BADGE[source] ??
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  );
}

export const CUSTOMER_STATUS_BADGE = {
  Active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  Inactive: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export function customerStatusBadge(status) {
  return (
    CUSTOMER_STATUS_BADGE[status] ??
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  );
}
