// Exports a deal. These are the fields the API actually returns on /deals —
// the previous version read reportType/amount/orders/date, which do not exist
// on a deal, so every export threw on report.amount.toLocaleString().
//
// jspdf and its autotable plugin are a few hundred KB, so they are imported
// dynamically. They only load if someone actually clicks Export PDF, which
// keeps them out of the Reports route chunk.
const DEAL_FIELDS = [
  ["Deal ID", (deal) => deal.id],
  ["Deal Title", (deal) => deal.title],
  ["Customer", (deal) => deal.customer],
  ["Owner", (deal) => deal.owner],
  ["Stage", (deal) => deal.stage],
  ["Value", (deal) => `$${Number(deal.value ?? 0).toLocaleString()}`],
  ["Created", (deal) => deal.createdDate ?? "—"],
  ["Expected Close", (deal) => deal.expectedClose ?? "—"],
];

const exportPdf = async (deal) => {
  if (!deal) {
    console.error("exportPdf called without a deal");
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
  doc.setFontSize(22);
  doc.text("Deal Report", 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  // ===== Deal Info =====
  autoTable(doc, {
    startY: 45,
    head: [["Field", "Value"]],
    body: DEAL_FIELDS.map(([label, read]) => [label, String(read(deal) ?? "—")]),
    theme: "grid",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    styles: {
      fontSize: 11,
      cellPadding: 4,
    },
  });

  // ===== Footer =====
  const pageHeight = doc.internal.pageSize.height;

  doc.setDrawColor(220);
  doc.line(14, pageHeight - 20, 196, pageHeight - 20);

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("CRM Dashboard • Generated using React", 14, pageHeight - 10);

  doc.save(`deal-${deal.id ?? "report"}.pdf`);
};

export default exportPdf;
