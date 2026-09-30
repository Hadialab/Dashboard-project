import { describe, it, expect, vi, beforeEach } from "vitest";

import exportCsv, { exportActivityCsv } from "../utils/exportCsv";
import { downloadCsv } from "../utils/downloadCsv";
import { objectUrls, generatedFiles } from "./setup";

/**
 * These tests read the generated file back rather than asserting on a mock.
 *
 * That is deliberate. The exporter had a real field-mismatch bug twice: once when
 * it read reportType/amount off a deal, and once when the dashboard reshaped
 * activity rows into deal-shaped objects so a customer's status landed in a
 * "Stage" column and every value came out 0. Both produced a file that downloaded
 * successfully and was silently wrong. A test that only checked "a download was
 * triggered" would have passed both times.
 */

/** The text of the most recent file that was generated. */
async function lastCsvText() {
  const entry = generatedFiles[generatedFiles.length - 1];
  if (!entry) throw new Error("no CSV was generated");

  return entry.blob.text();
}

/** Captures the `download` attribute of every anchor the exporter clicks. */
async function withDownloadNames(run) {
  const names = [];
  const original = HTMLAnchorElement.prototype.click;

  HTMLAnchorElement.prototype.click = function record() {
    names.push(this.getAttribute("download"));
  };

  try {
    await run();
  } finally {
    HTMLAnchorElement.prototype.click = original;
  }

  return names;
}

const deals = [
  {
    id: "d039",
    title: "Vertex Fleet",
    customer: "Vertex Logistics",
    owner: "QA Admin",
    stage: "Lead",
    value: 14000,
    createdDate: "2026-09-01",
    expectedClose: "2026-10-03",
  },
  {
    id: "d040",
    title: "Nova, Dashboards",
    customer: "Nova Analytics",
    owner: "Unassigned",
    stage: "Won",
    // A NUMERIC column arrives from pg as a string.
    value: "8500.5",
    createdDate: "2026-09-02",
    expectedClose: "2026-10-20",
  },
];

describe("exportCsv (deals)", () => {
  beforeEach(() => {
    objectUrls.length = 0;
  });

  it("writes the columns a deal actually has", async () => {
    await exportCsv([deals[0]]);
    const text = await lastCsvText();

    expect(text.split("\r\n")[0]).toBe(
      "Deal ID,Deal,Customer,Owner,Stage,Value,Created,Expected Close",
    );
  });

  it("reads title/customer/owner/stage, not reportType/amount", async () => {
    await exportCsv([deals[0]]);
    const text = await lastCsvText();

    expect(text).toContain("Vertex Fleet");
    expect(text).toContain("Vertex Logistics");
    expect(text).toContain("QA Admin");
    expect(text).toContain("Lead");
    // The bug this guards against: a field that does not exist on a deal.
    expect(text).not.toContain("undefined");
  });

  it("coerces a stringified value to a number", async () => {
    await exportCsv([deals[1]]);
    const text = await lastCsvText();

    // Not "08500.5".
    expect(text).toContain("8500.5");
  });

  it("quotes a value containing a comma so the row survives a spreadsheet", async () => {
    await exportCsv([deals[1]]);
    const text = await lastCsvText();

    expect(text).toContain('"Nova, Dashboards"');
  });

  it("writes both dates", async () => {
    await exportCsv([deals[0]]);
    const text = await lastCsvText();

    expect(text).toContain("2026-09-01");
    expect(text).toContain("2026-10-03");
  });

  it("names the file deals.csv", async () => {
    const names = await withDownloadNames(() => exportCsv([deals[0]]));

    expect(names).toEqual(["deals.csv"]);
  });

  it("revokes the object URL so the blob can be collected", async () => {
    await exportCsv([deals[0]]);
    // The setup file removes the entry from objectUrls on revoke, while
    // generatedFiles keeps it so the contents stay readable.
    expect(objectUrls).toHaveLength(0);
    expect(generatedFiles).toHaveLength(1);
  });

  it("warns and writes nothing for an empty list", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await exportCsv([]);

    expect(warn).toHaveBeenCalled();
    expect(generatedFiles).toHaveLength(0);
  });
});

describe("exportActivityCsv", () => {
  beforeEach(() => {
    objectUrls.length = 0;
  });

  const activity = [
    { id: "c-c046", title: "New customer added", description: "Nadine C — Beirut Dairy", time: "2026-09-30" },
    { id: "l-l045", title: "New lead captured", description: "Marwan Y via Website", time: "2026-09-28" },
  ];

  it("writes the activity columns, not the deal columns", async () => {
    await exportActivityCsv(activity);
    const text = await lastCsvText();

    expect(text.split("\r\n")[0]).toBe("ID,Activity,Detail,When");
  });

  it("never puts a customer status in a column headed Stage", async () => {
    // The bug: activity was reshaped into deal-shaped rows, so a customer's
    // status landed under "Stage" and every Value was 0.
    await exportActivityCsv([
      { id: "c-c046", title: "New customer added", description: "Nadine C", time: "2026-09-30" },
    ]);
    const text = await lastCsvText();

    expect(text).not.toContain("Stage");
    expect(text).not.toContain("Owner");
    expect(text).not.toContain("Deal ID");
  });

  it("carries a real timestamp for every row", async () => {
    await exportActivityCsv(activity);
    const text = await lastCsvText();

    expect(text).toContain("2026-09-30");
    expect(text).toContain("2026-09-28");
  });

  it("leaves When blank rather than inventing a value", async () => {
    await exportActivityCsv([{ id: "x", title: "T", description: "D" }]);
    const text = await lastCsvText();

    expect(text.split("\r\n")[1].endsWith(",")).toBe(true);
  });

  it("names the file recent-activity.csv", async () => {
    const names = await withDownloadNames(() => exportActivityCsv(activity));

    expect(names).toEqual(["recent-activity.csv"]);
  });
});

describe("downloadCsv", () => {
  beforeEach(() => {
    objectUrls.length = 0;
  });

  it("is a no-op for a non-array", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await downloadCsv("x.csv", null);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("x.csv"));
  });

  it("takes the header from the first row, so a later extra key is dropped", async () => {
    // papaparse derives columns from the first object rather than the union of
    // all of them. Pinned because it is a real footgun: an exporter that maps
    // rows to differently-shaped objects would silently lose a column. Every
    // exporter in this codebase maps to a fixed shape first, which is why this is
    // safe today.
    await downloadCsv("mixed.csv", [{ a: 1 }, { a: 2, b: 3 }]);
    const text = await lastCsvText();

    expect(text).toBe("a\r\n1\r\n2");
  });

  it("writes one row per record, in order", async () => {
    await downloadCsv("rows.csv", [{ a: 1 }, { a: 2 }, { a: 3 }]);
    const text = await lastCsvText();

    expect(text.split("\r\n")).toEqual(["a", "1", "2", "3"]);
  });
});
