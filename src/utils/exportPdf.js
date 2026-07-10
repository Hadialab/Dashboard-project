import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const exportPdf = (report) => {
  const doc = new jsPDF();

  // ===== Header =====
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("Business Report", 14, 20);

  doc.setFontSize(10);
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    14,
    28
  );

  // ===== Report Info =====
  autoTable(doc, {
    startY: 45,

    head: [["Field", "Value"]],

    body: [
      ["Report ID", report.id],
      ["Customer", report.customer],
      ["Report Type", report.reportType],
      ["Status", report.status],
      ["Revenue", `$${report.amount.toLocaleString()}`],
      ["Orders", report.orders],
      ["Date", report.date],
    ],

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

  doc.line(
    14,
    pageHeight - 20,
    196,
    pageHeight - 20
  );

  doc.setFontSize(10);

  doc.setTextColor(120);

  doc.text(
    "Dashboard Project • Generated using React",
    14,
    pageHeight - 10
  );

  doc.save(`report-${report.id}.pdf`);
};

export default exportPdf;