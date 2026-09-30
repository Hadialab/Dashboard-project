import { downloadCsv } from "./downloadCsv";
import type { Deal } from "../types";

/** One row of the dashboard's activity feed, as the Dashboard page builds it. */
export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  /**
   * A date, not a status. This was the customer's status, so the row read
   * "Nadine C — Beirut Dairy | Active" in a slot the UI styles and reads as a
   * timestamp — and the CSV export inherited the confusion.
   */
  time?: string;
};

/** Exports deals. Matches the /deals shape. */
const exportCsv = async (deals: Deal[]): Promise<void> => {
  const data = deals.map((deal) => ({
    "Deal ID": deal.id,
    Deal: deal.title,
    Customer: deal.customer,
    Owner: deal.owner,
    Stage: deal.stage,
    // Coerced: a NUMERIC column arrives from pg as a string.
    Value: Number(deal.value ?? 0),
    Created: deal.createdDate ?? "",
    "Expected Close": deal.expectedClose ?? "",
  }));

  await downloadCsv("deals.csv", data);
};

/**
 * Exports the dashboard's activity feed.
 *
 * Activity rows are not deals. This previously reshaped them into deal-shaped
 * objects so they could be passed to the deals exporter, which produced a file
 * headed "Deal ID, Deal, Customer, Owner, Stage, Value…" where Stage held a
 * customer's status, every Value was 0, and both date columns were blank. The
 * columns below are the ones the feed actually shows.
 */
const exportActivityCsv = async (items: ActivityItem[]): Promise<void> => {
  const data = items.map((item) => ({
    ID: item.id,
    Activity: item.title,
    Detail: item.description,
    When: item.time ?? "",
  }));

  await downloadCsv("recent-activity.csv", data);
};

export { exportActivityCsv };
export default exportCsv;
