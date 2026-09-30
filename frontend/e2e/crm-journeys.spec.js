import { test, expect } from "@playwright/test";
import {
  signUp,
  gotoLeads,
  gotoPipeline,
  createLead,
  createDeal,
  dealCard,
  stageColumn,
  dragDealToStage,
  tableRow,
} from "./helpers";

/**
 * Lead conversion, the pipeline board, and a bulk CSV import — the three
 * journeys with the most ways to fail quietly.
 */

test.describe("lead conversion", () => {
  test("converts a lead and shows it as converted, not deleted", async ({ page }) => {
    await signUp(page);
    await gotoLeads(page);

    await createLead(page, {
      name: "Nadia C",
      company: "Achrafieh Hotels",
      email: "nadia@hotels.test",
      phone: "+961 1 222 002",
    });
    await expect(tableRow(page, "Nadia C")).toBeVisible();

    await tableRow(page, "Nadia C").getByRole("button", { name: /convert nadia c to a customer/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Prefilled from the lead.
    await expect(dialog.getByLabel(/full name/i)).toHaveValue("Nadia C");

    await dialog.getByRole("button", { name: /convert to customer/i }).click();
    await expect(dialog).toBeHidden();

    // The lead is kept, marked Converted. A deleted lead would lose the history.
    await expect(tableRow(page, "Nadia C")).toContainText(/Converted/);
  });

  test("does not warn about a duplicate for a lead that is not a customer", async ({ page }) => {
    await signUp(page);
    await gotoLeads(page);
    await createLead(page, {
      name: "Marwan Y",
      company: "Bekaa Dairy",
      email: "marwan@bekaa.test",
      phone: "+961 1 222 001",
    });

    await tableRow(page, "Marwan Y").getByRole("button", { name: /convert marwan y to a customer/i }).click();
    const dialog = page.getByRole("dialog");

    // The regression this guards: the warning used to match the lead against
    // itself and was therefore permanently on.
    await expect(dialog.getByText(/already uses this email/i)).toHaveCount(0);
  });

  test("survives a reload after converting", async ({ page }) => {
    await signUp(page);
    await gotoLeads(page);
    await createLead(page, {
      name: "Sandra M",
      company: "Achrafieh Wellness",
      email: "sandra@wellness.test",
      phone: "+961 1 222 003",
    });

    await tableRow(page, "Sandra M").getByRole("button", { name: /convert sandra m to a customer/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: /convert to customer/i }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.reload();
    // Converted is the default filter's excluded state, so ask for them.
    await page.goto("/leads?converted=only");
    await expect(tableRow(page, "Sandra M")).toContainText(/Converted/);
  });
});

test.describe("pipeline board", () => {
  test("renders every stage as a column once there is a deal", async ({ page }) => {
    await signUp(page);
    // An empty pipeline shows an empty state rather than the board, so a deal has
    // to exist before the columns are meaningful.
    await createDeal(page, { title: "First Deal", customer: "First Co" });
    await gotoPipeline(page);

    for (const stage of ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]) {
      // A stage with no deals must still be a column, or there is nowhere to drag
      // into.
      await expect(page.getByRole("region", { name: new RegExp(`^${stage} stage`) })).toBeVisible();
    }
  });

  test("shows the empty state for a pipeline with no deals", async ({ page }) => {
    await signUp(page);
    await gotoPipeline(page);

    await expect(page.getByText(/no deals/i)).toBeVisible();
  });

  test("moves a deal between stages by dragging and persists it", async ({ page }) => {
    await signUp(page);
    await createDeal(page, { title: "Drag Deal", customer: "Drag Co", value: "5000" });
    await gotoPipeline(page);

    // The draggable element, not the text inside it — a drag has to start on the
    // draggable node or the browser never begins one.
    const card = dealCard(page, "Drag Deal");
    await expect(card).toBeVisible();

    await dragDealToStage(page, "Drag Deal", "Negotiation");
    await expect(stageColumn(page, "Negotiation").getByRole("button", { name: /Drag Deal/ })).toBeVisible();

    // The real test: did the database agree?
    await page.reload();
    await expect(stageColumn(page, "Negotiation").getByRole("button", { name: /Drag Deal/ })).toBeVisible();
  });

  test("moves a deal via the stage select, which is the touch and keyboard path", async ({ page }) => {
    // HTML5 drag-and-drop has no touch support at all, so the per-card select is
    // the only way to move a deal on a phone. It must persist exactly as the drag
    // does, or the board is unusable on mobile.
    await signUp(page);
    await createDeal(page, { title: "Select Deal", customer: "Select Co", value: "6000" });
    await gotoPipeline(page);

    await page.getByRole("combobox", { name: /stage for select deal/i }).selectOption("Proposal");

    // Matched on the card's accessible name, which is unique. A loose text match
    // also hits the screen-reader-only "Move … to another stage" label.
    await expect(stageColumn(page, "Proposal").getByRole("button", { name: /Select Deal/ })).toBeVisible();

    await page.reload();
    await expect(stageColumn(page, "Proposal").getByRole("button", { name: /Select Deal/ })).toBeVisible();
  });
});

test.describe("bulk CSV import", () => {
  test("flags invalid rows and imports only the valid ones", async ({ page }) => {
    await signUp(page);
    await gotoLeads(page);

    // The Leads toolbar — and with it the Import control — only renders once the
    // list has rows, so the workspace needs a lead before import is reachable.
    await createLead(page, {
      name: "Existing Lead",
      company: "Existing Co",
      email: "existing@test.local",
      phone: "+961 1 400 000",
    });

    // A mix of good rows, a missing name, a bad email, and a bad phone.
    // `status` and `source` are required by the lead schema, so they have to be in
    // the file — without them every row is invalid and nothing is importable.
    const csv = [
      "name,company,email,phone,status,source",
      "Import One,Import Co,import.one@test.local,+961 1 400 001,New,Website",
      ",Missing Name,noname@test.local,+961 1 400 002,New,Website",
      "Import Two,Import Co,bad-email,+961 1 400 003,New,Website",
      "Import Three,Import Co,import.three@test.local,12345,New,Website",
      "Import Four,Import Co,import.four@test.local,+961 1 400 005,Contacted,Referral",
    ].join("\n");

    await page.getByRole("button", { name: /import csv/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator('input[type="file"]').setInputFiles({
      name: "leads.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });

    // Column mapping, auto-detected from the headers.
    await dialog.getByRole("button", { name: /review \d+ rows/i }).click();

    // Each bad row must say what is wrong with it, not vanish silently.
    await expect(dialog.getByText(/name must be at least/i)).toBeVisible();
    await expect(dialog.getByText(/invalid email/i)).toBeVisible();
    await expect(dialog.getByText(/invalid phone/i)).toBeVisible();

    // Two good rows out of five.
    const importButton = dialog.getByRole("button", { name: /import 2 records/i });
    await importButton.click();

    // The modal does not close on success — it reports what happened, which is
    // the only way to see that three rows were deliberately left behind.
    // Matched loosely on the total because the denominator is the number of rows
    // attempted, not the number of lines in the file.
    await expect(dialog.getByText(/imported 2 of/i)).toBeVisible();
    await expect(dialog.getByText(/failed validation/i)).toBeVisible();
    await expect(dialog.getByText(/neither was\s+saved/i)).toBeVisible();

    // Closing it reveals the list. Reloaded rather than read straight off the
    // previous render, because the point is that the rows reached the database —
    // not that a component happened to be holding them.
    await dialog.getByRole("button", { name: /close|done|finish/i }).last().click();
    await expect(dialog).toBeHidden();
    await page.reload();

    await expect(tableRow(page, "Import One")).toBeVisible();
    await expect(tableRow(page, "Import Four")).toBeVisible();
    // The invalid ones were held back.
    await expect(tableRow(page, "Missing Name")).toHaveCount(0);
  });

  test("flags a duplicate customer email rather than creating a second record", async ({ page }) => {
    await signUp(page);
    await gotoLeads(page);

    // Create a customer whose email the CSV will then reuse.
    await page.getByRole("link", { name: "Customers", exact: true }).click();
    await page.getByRole("button", { name: /add customer/i }).click();
    const customerDialog = page.getByRole("dialog");
    await customerDialog.getByLabel(/full name/i).fill("Dup Owner");
    await customerDialog.getByLabel(/company/i).fill("Dup Co");
    await customerDialog.getByLabel(/email/i).fill("dup.owner@test.local");
    await customerDialog.getByLabel(/phone/i).fill("+961 1 500 001");
    await customerDialog.getByRole("button", { name: /^add customer$/i }).click();
    await expect(customerDialog).toBeHidden();

    await gotoLeads(page);

    // Same as the other import test: the Import control lives in the toolbar, so
    // the list needs at least one row for it to exist.
    await createLead(page, {
      name: "Another Existing Lead",
      company: "Another Co",
      email: "another@test.local",
      phone: "+961 1 500 000",
    });

    const csv = [
      "name,company,email,phone,status,source",
      "Fresh Lead,Fresh Co,fresh.lead@test.local,+961 1 500 002,New,Website",
      "Duplicate Lead,Dup Co,dup.owner@test.local,+961 1 500 003,New,Website",
    ].join("\n");

    await page.getByRole("button", { name: /import csv/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "dupes.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    await dialog.getByRole("button", { name: /review \d+ rows/i }).click();

    // "Duplicate email" appears twice — once in the summary tally and once in the
    // offending row — so the row badge is the one that matters here.
    await expect(
      dialog.getByRole("row").filter({ hasText: "Duplicate Lead" }).getByText(/duplicate email/i),
    ).toBeVisible();

    // The duplicate is held back, not silently imported.
    await expect(dialog.getByRole("button", { name: /import 1 record/i })).toBeVisible();
  });
});
