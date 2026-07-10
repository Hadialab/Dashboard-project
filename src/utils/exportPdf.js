import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const exportPdf = (report) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.text("Business Report", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text("Generated from Dashboard Project", 14, 28);

  autoTable(doc, {
    startY: 40,
    head: [["Field", "Value"]],
    body: [
      ["Customer", report.customer],
      ["Report Type", report.reportType],
      ["Status", report.status],
      ["Revenue", `$${report.amount.toLocaleString()}`],
      ["Orders", report.orders],
      ["Date", report.date],
    ],
    headStyles: {
      fillColor: [37, 99, 235],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  doc.save(`report-${report.id}.pdf`);
};

export default exportPdf;