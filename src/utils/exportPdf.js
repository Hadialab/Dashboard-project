import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const exportPdf = (report) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("Business Report", 14, 20);

  doc.setFontSize(11);

  autoTable(doc, {
    startY: 35,
    head: [["Field", "Value"]],
    body: [
      ["Customer", report.customer],
      ["Report Type", report.reportType],
      ["Status", report.status],
      ["Revenue", `$${report.amount.toLocaleString()}`],
      ["Orders", report.orders],
      ["Date", report.date],
    ],
  });

  doc.save(`report-${report.id}.pdf`);
};

export default exportPdf;