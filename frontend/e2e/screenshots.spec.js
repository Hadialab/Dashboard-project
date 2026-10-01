import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { createCustomer, createDeal, gotoCustomers, gotoDeals, gotoPipeline, signUp } from "./helpers.js";

/**
 * Captures the screenshots in the README.
 *
 * Run with `npm run screenshots`, not as part of the E2E suite: it writes files
 * and needs a predictable amount of data on screen, and a normal `npm run
 * test:e2e` should stay side-effect free.
 *
 * Skipped by default so it cannot fail a normal test run. CAPTURE_SCREENSHOTS=1
 * turns it on.
 *
 * The data is created through the real UI rather than seeded into the database,
 * so the screenshots cannot show a state the app cannot actually reach — a
 * hand-built fixture eventually drifts from what the forms produce, and the
 * screenshot becomes a lie.
 */

const OUT_DIR = path.resolve(import.meta.dirname, "..", "..", "docs", "screenshots");

const enabled = process.env.CAPTURE_SCREENSHOTS === "1";

/** Waits for charts to finish animating, or they photograph mid-draw. */
async function settle(page) {
  await page.waitForLoadState("networkidle");
  // Recharts animates over ~1.5s. Shorter than that and the bars are caught
  // halfway up, which looks like a rendering bug rather than a transition.
  await page.waitForTimeout(2200);
}

test.describe("README screenshots", () => {
  test.skip(!enabled, "Set CAPTURE_SCREENSHOTS=1 to regenerate the README screenshots.");

  test("capture the main screens", async ({ page }) => {
    test.slow(); // A build and several full page loads.

    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

    const shot = async (name) => {
      await settle(page);
      await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
    };

    // 1440 for the page shots, and wider for the board. Six columns at the width
    // the app gives each one need about 1700px alongside the sidebar; at 1440 the
    // board scrolls sideways and the screenshot shows three columns with the
    // fourth cut in half, which reads as a broken layout rather than a
    // deliberately scrollable one.
    await page.setViewportSize({ width: 1440, height: 900 });

    await signUp(page);

    // Enough spread across the stages that the board reads as a pipeline rather
    // than one populated column and five empty ones.
    const customers = [
      ["Amara Okonkwo", "Northwind Logistics"],
      ["Diego Ferreira", "Cobalt Systems"],
      ["Priya Raman", "Halcyon Labs"],
      ["Tom Whitfield", "Brightline Retail"],
    ];

    for (const [name, company] of customers) {
      await gotoCustomers(page);
      await createCustomer(page, {
        name,
        company,
        email: `${name.split(" ")[0].toLowerCase()}@${company.split(" ")[0].toLowerCase()}.example`,
        phone: "+1 555 0100",
      });
    }

    // Every deal is created in the default stage, then moved. Matches how the
    // board works: a new deal lands in Lead and is dragged or selected along.
    const deals = [
      ["Northwind annual licence", 48_000, "Qualified"],
      ["Cobalt platform migration", 26_500, "Proposal"],
      ["Halcyon seat expansion", 12_000, "Negotiation"],
      ["Brightline renewal", 31_000, "Won"],
      ["Cobalt support add-on", 7_500, "Won"],
    ];

    for (const [title, value, stage] of deals) {
      await gotoDeals(page);
      await createDeal(page, {
        title,
        customer: customers[0][1],
        value: String(value),
        expectedClose: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      });

      // A deal is created in the default stage, so moving it means going to the
      // board. The per-card select is used rather than the drag because this is a
      // screenshot and the select is the deterministic path; the drag itself is
      // covered by the E2E suite.
      if (stage !== "Lead") {
        await gotoPipeline(page);
        await page.getByLabel(`Stage for ${title}`).selectOption(stage);
        await page.waitForTimeout(400); // Let the column reflow before the next deal.
      }
    }

    await gotoCustomers(page);
    await shot("customers");

    // Wide enough for all six stage columns at once.
    await page.setViewportSize({ width: 1920, height: 1000 });
    await gotoPipeline(page);
    await shot("pipeline");
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/dashboard");
    await shot("dashboard");

    await page.goto("/reports");
    await shot("reports");

    await page.goto("/login");
    await shot("login");

    // Confirms the files exist before reporting success, so a silent failure to
    // write does not read as "screenshots updated".
    for (const name of ["customers", "pipeline", "dashboard", "reports", "login"]) {
      expect(existsSync(path.join(OUT_DIR, `${name}.png`))).toBe(true);
    }
  });
});
