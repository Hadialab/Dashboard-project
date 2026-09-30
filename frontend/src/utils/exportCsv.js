import { downloadCsv } from "./downloadCsv";

// Exports deals. Matches the /deals shape — the previous version read
// reportType/amount/orders/date, so every column came out as "undefined".
const exportCsv = async (deals) => {
  const data = deals.map((deal) => ({
    "Deal ID": deal.id,
    Deal: deal.title,
    Customer: deal.customer,
    Owner: deal.owner,
    Stage: deal.stage,
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
const exportActivityCsv = async (items) => {
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
