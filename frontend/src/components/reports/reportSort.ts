/**
 * How the reports table can be sorted.
 *
 * A separate module from ReportFilters.tsx rather than exported alongside it: that
 * file is a React component, and a module exporting both a component and a plain
 * function breaks Fast Refresh — the dev server reloads the whole page on save
 * instead of swapping the component, which is the point of having it. `oxlint`
 * warns about exactly this, and the warning is worth taking seriously rather than
 * suppressing.
 */

/** A deal field to sort by, or "none". */
export type ReportSortKey =
  | "none"
  | "title"
  | "customer"
  | "value"
  | "stage"
  | "expectedClose";

/** The sortable fields, in the order the select offers them. */
const REPORT_SORT_KEYS: ReportSortKey[] = [
  "none",
  "title",
  "customer",
  "value",
  "stage",
  "expectedClose",
];

/**
 * Narrows an untrusted sort key to a real one.
 *
 * The value comes out of the URL, which anyone can edit, and the page then indexes
 * a Deal with it. A cast would type-check and quietly sort by nothing for any
 * value the select does not offer; this rejects it instead.
 *
 * Returns "none" for null, for an absent parameter, and for anything
 * unrecognised — the same answer the `|| "none"` fallback it replaced gave for
 * every case except the last.
 */
export function asReportSortKey(value: string | null | undefined): ReportSortKey {
  return REPORT_SORT_KEYS.includes(value as ReportSortKey)
    ? (value as ReportSortKey)
    : "none";
}