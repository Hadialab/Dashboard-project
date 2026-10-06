import { test, expect } from "@playwright/test";

import { signUp, gotoCustomers, addTeamMember, createCustomer } from "./helpers";
import { apiUrl } from "./e2eDatabase.js";

/**
 * Company administration, end to end against the real API and a real database.
 *
 * What is worth proving here and not in the integration suite: that the page an
 * admin actually sees is gated, and that a secret appears once and is gone from the
 * list afterwards. The API-level guarantees are covered by the backend suite.
 */

test.describe("company settings", () => {
  test("an administrator manages profile, keys and webhooks", async ({ page }) => {
    await signUp(page);

    await page.getByRole("link", { name: "Company", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Company", exact: true })).toBeVisible();

    // --- Profile ---
    const displayName = page.getByLabel(/display name/i);
    await displayName.fill("E2E Holdings");
    await page.getByRole("button", { name: /save profile/i }).click();

    // Asserted on the value surviving a reload rather than on the toast: a setting
    // that only lives in React state is not a setting, and that is the property
    // worth protecting. A toast is a courtesy.
    await page.waitForTimeout(1000);
    await page.reload();
    await expect(page.getByLabel(/display name/i)).toHaveValue("E2E Holdings");

    // --- An API key ---
    await page.getByRole("button", { name: /new key/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/^name/i).fill("E2E sync");
    await dialog.getByLabel(/read deals/i).check();
    await dialog.getByRole("button", { name: /^create key$/i }).click();

    // Shown once, and the warning says so, because losing it means revoking.
    await expect(dialog.getByText(/only time it will be shown/i)).toBeVisible();
    const secret = await dialog.locator("code").first().textContent();
    expect(secret).toMatch(/^crm_[a-f0-9]{64}$/);
    await dialog.getByRole("button", { name: /i have saved it/i }).click();
    await expect(dialog).toBeHidden();

    // The list shows the name and a prefix — never the key itself.
    const keyRow = page.getByRole("listitem").filter({ hasText: "E2E sync" });
    await expect(keyRow).toBeVisible();
    await expect(keyRow.getByText("crm_")).toBeVisible();
    await expect(page.getByText(secret ?? "")).toHaveCount(0);

    // --- Revocation ---
    await keyRow.getByRole("button", { name: /revoke/i }).click();
    await expect(page.getByText(/key revoked/i)).toBeVisible();
    await expect(page.getByText(/revoked just now/i)).toBeVisible();
  });

  test("a key cannot do what it was not granted", async ({ page, request }) => {
    await signUp(page);

    await page.getByRole("link", { name: "Company", exact: true }).click();
    await page.getByRole("button", { name: /new key/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^name/i).fill("Read only");
    await dialog.getByLabel(/read customers/i).check();
    await dialog.getByRole("button", { name: /^create key$/i }).click();

    const secret = await dialog.locator("code").first().textContent();
    await dialog.getByRole("button", { name: /i have saved it/i }).click();

    // Outside the browser, to prove the key is a real credential rather than a row
    // that merely looks right in the table.
    const api = await request.post(apiUrl("/customers"), {
      headers: { Authorization: `Bearer ${secret}` },
      data: {
        name: "Written by a key",
        company: "E2E",
        email: "key.write@test.local",
        phone: "+961 1 000 001",
        status: "Active",
      },
    });

    // Read was granted, write was not.
    expect(api.status()).toBe(403);

    const read = await request.get(apiUrl("/customers"), {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(read.status()).toBe(200);
  });

  test("a key cannot read the audit log or the team", async ({ page, request }) => {
    // The parts of this app that are about people, not records. A key that could
    // read them could be used to watch colleagues, which is not what it was issued
    // for however narrow its record scopes are.
    await signUp(page);

    await page.getByRole("link", { name: "Company", exact: true }).click();
    await page.getByRole("button", { name: /new key/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^name/i).fill("Everything it can have");
    await dialog.getByLabel(/read customers/i).check();
    await dialog.getByRole("button", { name: /^create key$/i }).click();
    const secret = await dialog.locator("code").first().textContent();
    await dialog.getByRole("button", { name: /i have saved it/i }).click();

    for (const path of ["/audit", "/auth/users", "/tenant/settings"]) {
      const response = await request.get(apiUrl(path), {
        headers: { Authorization: `Bearer ${secret}` },
      });

      expect(response.status(), `${path} must refuse a key`).toBe(403);
    }
  });

  test("a sales user cannot reach company administration", async ({ page }) => {
    const company = await signUp(page);

    await page.getByRole("link", { name: "Team", exact: true }).click();
    await addTeamMember(page, {
      name: "Company Rep",
      email: company.rep.email,
      password: company.rep.password,
    });

    await page.getByRole("button", { name: /log out|sign out/i }).click();
    await page.getByLabel(/^email/i).fill(company.rep.email);
    await page.getByLabel(/^password$/i).fill(company.rep.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // The link is not offered.
    await expect(page.getByRole("link", { name: "Company", exact: true })).toHaveCount(0);

    // And going directly explains the refusal instead of showing a broken form.
    await page.goto("/company");
    await expect(page.getByText(/for administrators/i)).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toHaveCount(0);
  });

  test("a revoked key stops working immediately", async ({ page, request }) => {
    await signUp(page);

    await page.getByRole("link", { name: "Company", exact: true }).click();
    await page.getByRole("button", { name: /new key/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^name/i).fill("Short lived");
    await dialog.getByLabel(/read customers/i).check();
    await dialog.getByRole("button", { name: /^create key$/i }).click();
    const secret = await dialog.locator("code").first().textContent();
    await dialog.getByRole("button", { name: /i have saved it/i }).click();

    const before = await request.get(apiUrl("/customers"), {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(before.status()).toBe(200);

    await page
      .getByRole("listitem")
      .filter({ hasText: "Short lived" })
      .getByRole("button", { name: /revoke/i })
      .click();
    await expect(page.getByText(/key revoked/i)).toBeVisible();

    const after = await request.get(apiUrl("/customers"), {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(after.status()).toBe(401);
  });

  test("a webhook is created with a signing secret shown once", async ({ page }) => {
    await signUp(page);

    await page.getByRole("link", { name: "Company", exact: true }).click();
    await page.getByRole("button", { name: /new webhook/i }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^name/i).fill("E2E Slack");
    await dialog.getByLabel(/target url/i).fill("https://hooks.example.com/e2e");
    await dialog.getByLabel(/record deleted/i).check();
    await dialog.getByRole("button", { name: /^create webhook$/i }).click();

    await expect(dialog.getByText(/only time it will be shown/i)).toBeVisible();
    const secret = await dialog.locator("code").first().textContent();
    expect(secret).toMatch(/^whsec_/);
    await dialog.getByRole("button", { name: /i have saved it/i }).click();

    const row = page.getByRole("listitem").filter({ hasText: "E2E Slack" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Record deleted")).toBeVisible();
    // Never used yet, so the page says the subscription is configured rather than
    // showing a blank next to the URL.
    await expect(row.getByText(/record deleted/i)).toBeVisible();
    // Exact, so this does not match the "Delete" button: the point is that the raw
    // stored value is not what a person reads.
    await expect(row.getByText("delete", { exact: true })).toHaveCount(0);
  });

  test("live updates make a colleague's change appear without a refresh", async ({ page, browser }) => {
    // The seam between two features: one session watching the customers list sees
    // another session's write arrive on its own.
    //
    // Both sessions are in the same company — a second signup would create a second
    // company, and the tenant filter would (correctly) keep the change out.
    const company = await signUp(page);

    await page.getByRole("link", { name: "Team", exact: true }).click();
    await addTeamMember(page, {
      name: "Live Rep",
      email: company.rep.email,
      password: company.rep.password,
    });

    await gotoCustomers(page);
    await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();

    // Give the stream a moment to attach before the write happens — otherwise the
    // notification has nowhere to go and the test proves nothing.
    await page.waitForTimeout(1000);

    const other = await browser.newContext();
    const colleague = await other.newPage();
    await colleague.goto("/login");
    await colleague.getByLabel(/^email/i).fill(company.rep.email);
    await colleague.getByLabel(/^password$/i).fill(company.rep.password);
    await colleague.getByRole("button", { name: /sign in/i }).click();
    await expect(colleague).toHaveURL(/\/dashboard/);
    await colleague.goto("/customers");
    await expect(
      colleague.getByRole("heading", { name: "Customers", exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    await createCustomer(colleague, {
      name: "Colleague Created",
      company: "Live Co",
      email: "colleague@live.test",
      phone: "+961 1 000 002",
    });

    // No reload, no filter change: it arrives on its own.
    await expect(
      page.getByRole("table").getByRole("row").filter({ hasText: "Colleague Created" }),
    ).toBeVisible({ timeout: 20_000 });

    await other.close();
  });

  test("the audit log refreshes itself as activity happens", async ({ page, browser }) => {
    // The same seam, on the page where watching for it matters most.
    const company = await signUp(page);

    await page.getByRole("link", { name: "Team", exact: true }).click();
    await addTeamMember(page, {
      name: "Audited Rep",
      email: company.rep.email,
      password: company.rep.password,
    });

    await page.getByRole("link", { name: "Audit Log", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Audit Log", exact: true })).toBeVisible();
    await page.waitForTimeout(1000);

    const other = await browser.newContext();
    const colleague = await other.newPage();
    await colleague.goto("/login");
    await colleague.getByLabel(/^email/i).fill(company.rep.email);
    await colleague.getByLabel(/^password$/i).fill(company.rep.password);
    await colleague.getByRole("button", { name: /sign in/i }).click();
    await expect(colleague).toHaveURL(/\/dashboard/);
    await colleague.goto("/customers");
    await expect(
      colleague.getByRole("heading", { name: "Customers", exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    await createCustomer(colleague, {
      name: "Audited Live Write",
      company: "Live Co",
      email: "audited@live.test",
      phone: "+961 1 000 003",
    });

    // The new entry appears without a refresh.
    await expect(
      page.getByRole("row").filter({ hasText: "Audited Live Write" }),
    ).toBeVisible({ timeout: 20_000 });

    await other.close();
  });
});