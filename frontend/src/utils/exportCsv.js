// Exports deals. Matches the /deals shape — the previous version read
// reportType/amount/orders/date, so every column came out as "undefined".
//
// papaparse is imported dynamically so it stays out of the route chunk until
// an export is actually requested.
const exportCsv = async (deals) => {
  if (!Array.isArray(deals) || deals.length === 0) {
    console.warn("exportCsv called with no rows");
    return;
  }

  const { default: Papa } = await import("papaparse");

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

  const csv = Papa.unparse(data);

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", "deals.csv");

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  // Release the object URL so the blob can be garbage collected.
  URL.revokeObjectURL(url);
};

export default exportCsv;
