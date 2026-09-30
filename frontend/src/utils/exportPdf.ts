import type { Deal } from "../types";

/**
 * Exports the Reports page's deal list as a PDF.
 *
 * These are the fields the API actually returns on /deals — the previous
 * version read reportType/amount/orders/date, which do not exist on a deal, so
 * every export threw on report.amount.toLocaleString(). It also only ever wrote
 * one deal at a time, and the two components that called it were a per-row menu
 * rather than anything page-level.
 *
 * jspdf and its autotable plugin are a few hundred KB, so they are imported
 * dynamically. They only load if someone actually clicks Export PDF, which keeps
 * them out of the Reports route chunk.
 */

/** A column definition: a heading, and how to read the value out of a deal. */
type Column<T> = [heading: string, read: (row: T) => string];

const DEAL_COLUMNS: Column<Deal>[] = [
  ["Deal", (deal) => deal.title],
  ["Customer", (deal) => deal.customer],
  ["Owner", (deal) => deal.owner ?? ""],
  ["Stage", (deal) => deal.stage],
  ["Value", (deal) => `$${Number(deal.value ?? 0).toLocaleString()}`],
  ["Expected Close", (deal) => deal.expectedClose ?? "—"],
];

/** The headline figures, so the PDF carries the same numbers as the screen. */
export type PdfSummary = {
  totalDeals: number;
  openDeals: number;
  wonValue: number;
  openValue: number;
  weighted: number;
  /** `null` rather than 0% when nothing has closed. */
  winRate: number | null;
};

const SUMMARY_FIELDS: Column<PdfSummary>[] = [
  ["Deals in report", (summary) => String(summary.totalDeals)],
  ["Open deals", (summary) => String(summary.openDeals)],
  ["Won to date", (summary) => `$${Number(summary.wonValue ?? 0).toLocaleString()}`],
  ["Open pipeline value", (summary) => `$${Number(summary.openValue ?? 0).toLocaleString()}`],
  ["Weighted forecast", (summary) => `$${Number(summary.weighted ?? 0).toLocaleString()}`],
  ["Win rate", (summary) => (summary.winRate === null ? "—" : `${summary.winRate}%`)],
];

export type ExportPdfOptions = {
  summary?: PdfSummary | null;
  title?: string;
};

/** autoTable wants rows, not columns: one array per record, in column order. */
function transpose<T>(columns: Column<T>[], rows: T[]): string[][] {
  return rows.map((row) => columns.map(([, read]) => String(read(row) ?? "—")));
}

/**
 * @param input  the rows to write. Accepts a single deal as well as a list,
 *                because the per-row menu passes one and the page passes many.
 * @param options.summary  the forecast figures, when the caller has them
 * @param options.title     what the file says it is, so a filtered export is
 *                          identifiable after it lands in a downloads folder
 */
const exportPdf = async (
  input: Deal | Deal[] | null | undefined,
  { summary = null, title = "Deals Report" }: ExportPdfOptions = {},
): Promise<void> => {
  const deals = Array.isArray(input) ? input : input ? [input] : [];

  if (deals.length === 0) {
    console.error("exportPdf called with no deals");
    return;
  }

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  /**
   * The two members this file uses that jsPDF's own types do not describe.
   *
   * `lastAutoTable` is added at runtime by the jspdf-autotable plugin, which
   * augments the class but not the shipped .d.ts. `getNumberOfPages` is reached
   * through `internal`, whose type omits it.
   *
   * Intersected with the real type rather than replacing it — a standalone shape
   * would drop every method jsPDF does provide and turn the whole file into
   * errors. Declared once here rather than sprinkled as `any` at each use.
   */
  type WithPlugin = InstanceType<typeof jsPDF> & {
    lastAutoTable?: { finalY: number };
    internal: { getNumberOfPages?: () => number; pages?: number[] };
  };

  const doc = new jsPDF() as WithPlugin;

  // ===== Cover header =====
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  const startY = 45;

  // ===== Summary =====
  if (summary) {
    autoTable(doc, {
      startY,
      head: [["Summary", "Value"]],
      // Label/value pairs, NOT transpose(): this table is two columns of
      // label-then-value, while the deal table below is one column per heading.
      // Running the summary through transpose produced a single six-cell row with
      // the labels nowhere in it.
      body: SUMMARY_FIELDS.map(([label, read]) => [label, read(summary)]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 11, cellPadding: 4 },
    });
  }

  // ===== Deals =====
  autoTable(doc, {
    // Picked up from the summary table so the two never overlap, even when there
    // is no summary and this starts at the top.
    startY: summary ? (doc.lastAutoTable?.finalY ?? startY) + 12 : startY,
    head: [DEAL_COLUMNS.map(([heading]) => heading)],
    body: transpose(DEAL_COLUMNS, deals),
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // ===== Footer on every page =====
  // A footer only on page 1 would be wrong on a report that runs over.
  const pageHeight = doc.internal.pageSize.height;
  const pageCount = doc.internal.getNumberOfPages?.() ?? doc.internal.pages?.length ?? 1;

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220);
    doc.line(14, pageHeight - 20, 196, pageHeight - 20);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("CRM Dashboard", 14, pageHeight - 12);
    doc.text(`Page ${page} of ${pageCount}`, 196, pageHeight - 12, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(deals.length === 1 ? `deal-${deals[0].id ?? stamp}.pdf` : `crm-deals-${stamp}.pdf`);
};

export default exportPdf;
