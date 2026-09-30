// Shared CSV plumbing: turn rows into a file and hand it to the browser.
//
// papaparse is imported dynamically so it stays out of the route chunk until an
// export is actually requested.
const downloadCsv = async (filename, data) => {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`downloadCsv called with no rows for ${filename}`);
    return;
  }

  const { default: Papa } = await import("papaparse");

  const csv = Papa.unparse(data);

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  // Release the object URL so the blob can be garbage collected.
  URL.revokeObjectURL(url);
};

export { downloadCsv };
export default downloadCsv;
