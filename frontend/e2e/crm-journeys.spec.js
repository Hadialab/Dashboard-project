import { test, expect } from "@playwright/test";
import { signUp, gotoLeads, gotoPipeline, createLead, tableRow } from "./helpers";

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
  test("renders every stage as a column", async ({ page }) => {
    await signUp(page);
    await gotoPipeline(page);

    for (const stage of ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]) {
      // An empty stage must still be a column, or there is nowhere to drag into.
      await expect(page.getByRole("region", { name: new RegExp(`^${stage} stage`) })).toBeVisible();
    }
  });

  test("moves a deal between stages by dragging and persists it", async ({ page }) => {
    await signUp(page);
    await gotoLeads(page);
    await createLead(page, { name: "Drag Lead", company: "Drag Co", email: "drag@test.local", phone: "+961 1 300 001" });

    await page.getByRole("button", { name: /add deal|create deal/i }).first().click();
    const dealDialog = page.getByRole("dialog");
    await dealDialog.getByLabel(/title/i).fill("Drag Deal");
    await dealDialog.getByLabel(/customer/i).fill("Drag Co");
    await dealDialog.getByLabel(/value/i).fill("5000");
    await dealDialog.getByRole("button", { name: /add deal|create deal|save/i }).click();
    await expect(dealDialog).toBeHidden();

    await gotoPipeline(page);

    const card = page.getByText("Drag Deal").first();
    await expect(card).toBeVisible();

    const target = page.getByRole("region", { name: /^Negotiation stage/ });
    // HTML5 drag-and-drop, which is what the board offers on a desktop.
    await card.dragTo(target);
    await expect(target.getByText("Drag Deal")).toBeVisible();

    // The real test: did the database agree?
    await page.reload();
    await expect(
      page.getByRole("region", { name: /^Negotiation stage/ }).getByText("Drag Deal"),
    ).toBeVisible();
  });

  test("moves a deal via the stage select, which is the touch and keyboard path", async ({ page }) => {
    // HTML5 drag-and-drop has no touch support at all, so the per-card select is
    // the only way to move a deal on a phone. It must persist exactly as the drag
    // does, or the board is unusable on mobile.
    await signUp(page);
    await gotoLeads(page);
    await createLead(page, { name: "Select Lead", company: "Select Co", email: "select@test.local", phone: "+961 1 300 002" });

    await page.getByRole("button", { name: /add deal|create deal/i }).first().click();
    const dealDialog = page.getByRole("dialog");
    await dealDialog.getByLabel(/title/i).fill("Select Deal");
    await dealDialog.getByLabel(/customer/i).fill("Select Co");
    await dealDialog.getByLabel(/value/i).fill("6000");
    await dealDialog.getByRole("button", { name: /add deal|create deal|save/i }).click();
    await expect(dealDialog).toBeHidden();

    await gotoPipeline(page);
    await page.getByRole("combobox", { name: /stage for select deal/i }).selectOption("Proposal");
    await expect(
      page.getByRole("region", { name: /^Proposal stage/ }).getByText("Select Deal"),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("region", { name: /^Proposal stage/ }).getByText("Select Deal"),
    ).toBeVisible();
  });
});

test.describe("bulk CSV import", () => {
  test("flags invalid rows and imports only the valid ones", async ({ page }) => {
    await signUp(page);
    await gotoLeads(page);

    // A mix of good rows, a missing name, a bad email, a bad phone, and a
    // duplicate of a customer created in a previous step.
    const csv = [
      "name,company,email,phone",
      "Import One,Import Co,import.one@test.local,+961 1 400 001",
      ",Missing Name,noname@test.local,+961 1 400 002",
      "Import Two,Import Co,bad-email,+961 1 400 003",
      "Import Three,Import Co,import.three@test.local,12345",
      "Import Four,Import Co,import.four@test.local,+961 1 400 005",
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
    const importButton = dialog.getByRole("button", { name: /import \d+ records/i });
    await expect(importButton).toHaveText(/import 2 records/i);
    await importButton.click();
    await expect(dialog).toBeHidden();

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

    const csv = [
      "name,company,email,phone",
      "Fresh Lead,Fresh Co,fresh.lead@test.local,+961 1 500 002",
      "Duplicate Lead,Dup Co,dup.owner@test.local,+961 1 500 003",
    ].join("\n");

    await page.getByRole("button", { name: /import csv/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "dupes.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    await dialog.getByRole("button", { name: /review \d+ rows/i }).click();

    await expect(dialog.getByText(/duplicate email/i)).toBeVisible();
    // The duplicate is held back, not silently imported.
    await expect(dialog.getByRole("button", { name: /import 1 records/i })).toBeVisible();
  });
});
