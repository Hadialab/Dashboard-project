import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * jsPDF has no DOM to measure against, so it is replaced with a recorder. What
 * matters here is not jsPDF's rendering but the shape of what this module hands
 * it: which columns, which rows, and whether the numbers are the ones on screen.
 *
 * The field-mismatch history is the reason. This exporter once read
 * reportType/amount/orders/date, none of which exist on a deal, so it threw on
 * every call. Asserting the table body catches that class of bug without
 * depending on a PDF layout engine.
 */
const recorded = { docs: [], pageCount: 1 };

vi.mock("jspdf", () => ({
  default: class FakeJsPDF {
    constructor() {
      this.saved = null;
      this.text = vi.fn();
      this.rect = vi.fn();
      this.setFillColor = vi.fn();
      this.setTextColor = vi.fn();
      this.setDrawColor = vi.fn();
      this.setFontSize = vi.fn();
      this.line = vi.fn();
      this.setPage = vi.fn();
      this.save = vi.fn((name) => {
        this.saved = name;
      });
      this.internal = {
        pageSize: { height: 297 },
        getNumberOfPages: () => recorded.pageCount,
      };
      // The real plugin sets this on the document after each table, and
      // exportPdf reads it to place the next table below the last one.
      this.lastAutoTable = { finalY: 100 };
      this.tables = [];
      // Recorded so a test can read back the tables and the chosen filename.
      recorded.docs.push(this);
    }
  },
}));

vi.mock("jspdf-autotable", () => ({
  default: (doc, options) => {
    doc.tables.push(options);
    // Each table advances the document's cursor, as the real plugin does, so a
    // test can see that the second table is placed below the first.
    doc.lastAutoTable = { finalY: 140 };
    return doc;
  },
}));

import exportPdf from "../utils/exportPdf";

/** The autoTable call that carries the deal rows, as opposed to the summary. */
function dealsTable(doc) {
  return doc.tables.find((t) => Array.isArray(t.head?.[0]) && t.head[0].includes("Deal"));
}

function summaryTable(doc) {
  return doc.tables.find((t) => t.head?.[0]?.[0] === "Summary");
}

const deals = [
  { id: "d039", title: "Vertex Fleet", customer: "Vertex Logistics", owner: "QA Admin", stage: "Lead", value: 14000, expectedClose: "2026-10-03" },
  { id: "d040", title: "Nova, Dashboards", customer: "Nova Analytics", owner: "Unassigned", stage: "Won", value: "8500.5", expectedClose: "2026-10-20" },
];

const summary = {
  totalDeals: 10,
  openDeals: 7,
  wonValue: 64500,
  openValue: 190500,
  weighted: 87375,
  winRate: 67,
};

beforeEach(async () => {
  recorded.docs.length = 0;
  recorded.pageCount = 1;
  // One export up front, so the table-shape tests have a document to inspect.
  await exportPdf(deals, { summary, title: "CRM Deals Report" });
});

describe("exportPdf", () => {
  it("reads the columns a deal actually has", async () => {
    await exportPdf([deals[0]]);
    const doc = lastDoc();

    expect(dealsTable(doc).head[0]).toEqual([
      "Deal",
      "Customer",
      "Owner",
      "Stage",
      "Value",
      "Expected Close",
    ]);
  });

  it("writes one row per deal, in the column order", async () => {
    await exportPdf(deals);
    const body = dealsTable(lastDoc()).body;

    expect(body).toHaveLength(2);
    expect(body[0]).toEqual(["Vertex Fleet", "Vertex Logistics", "QA Admin", "Lead", "$14,000", "2026-10-03"]);
  });

  it("formats a value as currency and coerces a stringified one", async () => {
    await exportPdf(deals);
    const body = dealsTable(lastDoc()).body;

    // Not "$NaN" — a NUMERIC column arrives from pg as a string.
    expect(body[1][4]).toBe("$8,500.5");
  });

  it("renders a missing close date as a dash rather than blank", async () => {
    await exportPdf([{ id: "d1", title: "T", value: 1 }]);

    expect(dealsTable(lastDoc()).body[0][5]).toBe("—");
  });

  it("includes the summary figures when given them", async () => {
    const table = summaryTable(lastDoc());
    const flat = Object.fromEntries(table.body);

    expect(flat["Deals in report"]).toBe("10");
    expect(flat["Open deals"]).toBe("7");
    expect(flat["Won to date"]).toBe("$64,500");
    expect(flat["Open pipeline value"]).toBe("$190,500");
    expect(flat["Weighted forecast"]).toBe("$87,375");
    expect(flat["Win rate"]).toBe("67%");
  });

  it("shows a dash for a win rate when nothing has closed", async () => {
    await exportPdf(deals, { summary: { ...summary, winRate: null } });
    const flat = Object.fromEntries(summaryTable(lastDoc()).body);

    // 0% would be a claim, and it would be wrong.
    expect(flat["Win rate"]).toBe("—");
  });

  it("omits the summary table entirely when there is none", async () => {
    await exportPdf(deals);

    expect(summaryTable(lastDoc())).toBeUndefined();
    // And the deal table starts at the top rather than at a stale offset.
    expect(dealsTable(lastDoc()).startY).toBe(45);
  });

  it("starts the deal table below the summary so the two cannot overlap", async () => {
    await exportPdf(deals, { summary });

    expect(dealsTable(lastDoc()).startY).toBeGreaterThan(summaryTable(lastDoc()).startY);
  });

  it("puts the title and generation date on the cover", async () => {
    await exportPdf(deals, { title: "CRM Deals Report" });
    const doc = lastDoc();
    const written = doc.text.mock.calls.map((call) => call[0]);

    expect(written).toContain("CRM Deals Report");
    expect(written.some((line) => String(line).startsWith("Generated:"))).toBe(true);
  });

  it("names a single-deal file after the deal", async () => {
    await exportPdf(deals[0]);

    expect(lastDoc().saved).toBe("deal-d039.pdf");
  });

  it("names a multi-deal file after the report and the day", async () => {
    await exportPdf(deals);

    expect(lastDoc().saved).toBe(`crm-deals-${new Date().toISOString().slice(0, 10)}.pdf`);
  });

  it("stamps a page footer on every page", async () => {
    recorded.pageCount = 3;
    await exportPdf(deals);
    const doc = lastDoc();

    // A footer only on page 1 would be wrong on a report that runs over.
    expect(doc.setPage).toHaveBeenCalledWith(1);
    expect(doc.setPage).toHaveBeenCalledWith(2);
    expect(doc.setPage).toHaveBeenCalledWith(3);
    recorded.pageCount = 1;
  });

  it("does nothing at all for an empty list", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    recorded.docs.length = 0;

    await exportPdf([]);

    expect(error).toHaveBeenCalled();
    expect(recorded.docs).toHaveLength(0);
  });

  it("does nothing for a null list", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    recorded.docs.length = 0;

    await exportPdf(null);

    expect(error).toHaveBeenCalled();
    expect(recorded.docs).toHaveLength(0);
  });

  it("accepts a single deal, which is what the per-row menu passes", async () => {
    await exportPdf(deals[0]);

    expect(dealsTable(lastDoc()).body).toHaveLength(1);
    expect(lastDoc().saved).toBe("deal-d039.pdf");
  });
});

/** The document from the most recent call. */
function lastDoc() {
  return recorded.docs[recorded.docs.length - 1];
}
