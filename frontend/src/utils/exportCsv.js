import Papa from "papaparse";

const exportCsv = (reports) => {
  const data = reports.map((report) => ({
    Customer: report.customer,
    "Report Type": report.reportType,
    Status: report.status,
    Revenue: report.amount,
    Orders: report.orders,
    Date: report.date,
  }));

  const csv = Papa.unparse(data);

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", "reports.csv");

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
};

export default exportCsv;