// Exports the Reports page's filtered deal list as a PDF.
//
// These are the fields the API actually returns on /deals — the previous
// version read reportType/amount/orders/date, which do not exist on a deal, so
// every export threw on report.amount.toLocaleString(). It also only ever wrote
// one deal at a time, and the two components that called it were imported by
// nothing, so the page had no PDF export at all.
//
// jspdf and its autotable plugin are a few hundred KB, so they are imported
// dynamically. They only load if someone actually clicks Export PDF, which
// keeps them out of the Reports route chunk.
const DEAL_COLUMNS = [
  ["Deal", (deal) => deal.title],
  ["Customer", (deal) => deal.customer],
  ["Owner", (deal) => deal.owner],
  ["Stage", (deal) => deal.stage],
  ["Value", (deal) => `$${Number(deal.value ?? 0).toLocaleString()}`],
  ["Expected Close", (deal) => deal.expectedClose ?? "—"],
];

const SUMMARY_FIELDS = [
  ["Deals in report", (summary) => String(summary.totalDeals)],
  ["Open deals", (summary) => String(summary.openDeals)],
  ["Won to date", (summary) => `$${Number(summary.wonValue ?? 0).toLocaleString()}`],
  ["Open pipeline value", (summary) => `$${Number(summary.openValue ?? 0).toLocaleString()}`],
  ["Weighted forecast", (summary) => `$${Number(summary.weighted ?? 0).toLocaleString()}`],
  [
    "Win rate",
    (summary) => (summary.winRate === null ? "—" : `${summary.winRate}%`),
  ],
];

/**
 * @param deals  the rows currently shown by the Reports table, already filtered
 * @param summary the forecast figures, so the PDF carries the headline numbers
 * @param title   what the file says it is, so a filtered export is identifiable
 */
const exportPdf = async (input, { summary = null, title = "Deals Report" } = {}) => {
  // Accepts one deal or a list. The per-row menu in the reports table passes a
  // single deal; the page-level export passes the whole filtered set.
  const deals = Array.isArray(input) ? input : input ? [input] : [];

  if (deals.length === 0) {
    console.error("exportPdf called with no deals");
    return;
  }

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();

  // ===== Header =====
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
    // is no summary and the table starts at the top.
    startY: summary ? doc.lastAutoTable.finalY + 12 : startY,
    head: [DEAL_COLUMNS.map(([label]) => label)],
    body: transpose(DEAL_COLUMNS, deals),
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // ===== Footer on every page =====
  const pageHeight = doc.internal.pageSize.height;
  const pageCount = doc.internal.getNumberOfPages();

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
  doc.save(
    deals.length === 1
      ? `deal-${deals[0].id ?? stamp}.pdf`
      : `crm-deals-${stamp}.pdf`,
  );
};

// autoTable wants rows, not columns: one array per deal, in column order.
function transpose(columns, rows) {
  return rows.map((row) => columns.map(([, read]) => String(read(row) ?? "—")));
}

export default exportPdf;
