import { test, expect } from "@playwright/test";
import { signUp, signIn, gotoCustomers, createCustomer, tableRow } from "./helpers";

/**
 * The critical user journeys, against a real API and a real database.
 *
 * Each test registers its own company, so there is no shared fixture to drift
 * and no cleanup that can be skipped.
 */

test.describe("authentication", () => {
  test("registers a company and lands on the dashboard", async ({ page }) => {
    await signUp(page);

    await expect(page.getByRole("heading", { name: /dashboard|welcome/i }).first()).toBeVisible();
    // The nav is the real signal that a session exists.
    await expect(page.getByRole("link", { name: "Pipeline", exact: true })).toBeVisible();
  });

  test("signs back in with the credentials it registered with", async ({ page }) => {
    const company = await signUp(page);

    await page.getByRole("button", { name: /log out|sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, company.admin);
    await expect(page.getByRole("link", { name: "Customers", exact: true })).toBeVisible();
  });

  test("refuses a wrong password and stays signed out", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("nobody@test.local");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Must not navigate, and must say why.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|incorrect|wrong|failed/i).first()).toBeVisible();
  });

  test("sends a signed-out visitor to the login page", async ({ page }) => {
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("customers", () => {
  test("adds a customer and sees it in the list", async ({ page }) => {
    await signUp(page);
    await gotoCustomers(page);

    await createCustomer(page, {
      name: "Jad Khoury",
      company: "Vertex Logistics",
      email: "jad@vertex.test",
      phone: "+961 1 111 001",
    });

    await expect(tableRow(page, "Jad Khoury")).toBeVisible();
  });

  test("keeps a new customer across a reload", async ({ page }) => {
    await signUp(page);
    await gotoCustomers(page);

    await createCustomer(page, {
      name: "Sara Mansour",
      company: "Nova Analytics",
      email: "sara@nova.test",
      phone: "+961 1 111 002",
    });
    await expect(tableRow(page, "Sara Mansour")).toBeVisible();

    await page.reload();
    // Persistence is the point: a row that only exists in component state is a bug.
    await expect(tableRow(page, "Sara Mansour")).toBeVisible();
  });

  test("edits a customer and persists the change", async ({ page }) => {
    await signUp(page);
    await gotoCustomers(page);
    await createCustomer(page, {
      name: "Rami Assaf",
      company: "Tyre Seafood",
      email: "rami@tyre.test",
      phone: "+961 1 111 003",
    });

    await tableRow(page, "Rami Assaf").getByRole("button", { name: /edit rami assaf/i }).click();
    const dialog = page.getByRole("dialog");
    const company = dialog.getByLabel(/company/i);
    await company.fill("Tyre Seafood Renamed");
    await dialog.getByRole("button", { name: /save|update/i }).click();
    await expect(dialog).toBeHidden();

    await expect(tableRow(page, "Tyre Seafood Renamed")).toBeVisible();
    await page.reload();
    await expect(tableRow(page, "Tyre Seafood Renamed")).toBeVisible();
  });

  test("deletes a customer after confirmation and keeps it deleted", async ({ page }) => {
    await signUp(page);
    await gotoCustomers(page);
    await createCustomer(page, {
      name: "Nadine C",
      company: "Beirut Dairy",
      email: "nadine@dairy.test",
      phone: "+961 1 111 004",
    });

    await tableRow(page, "Nadine C").getByRole("button", { name: /delete nadine c/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^delete customer$/i }).click();
    await expect(dialog).toBeHidden();

    await expect(tableRow(page, "Nadine C")).toHaveCount(0);
    await page.reload();
    await expect(tableRow(page, "Nadine C")).toHaveCount(0);
  });

  test("refuses an invalid email and explains why", async ({ page }) => {
    await signUp(page);
    await gotoCustomers(page);

    await page.getByRole("button", { name: /add customer/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/full name/i).fill("Bad Email");
    await dialog.getByLabel(/company/i).fill("Bad Co");
    await dialog.getByLabel(/email/i).fill("not-an-email");
    await dialog.getByLabel(/phone/i).fill("+961 1 111 005");
    await dialog.getByRole("button", { name: /^add customer$/i }).click();

    await expect(dialog.getByText(/invalid email|valid email/i)).toBeVisible();
  });
});

test.describe("search", () => {
  test("filters the customer list", async ({ page }) => {
    await signUp(page);
    await gotoCustomers(page);

    await createCustomer(page, { name: "Alpha One", company: "Alpha Co", email: "alpha@test.local", phone: "+961 1 200 001" });
    await createCustomer(page, { name: "Beta Two", company: "Beta Co", email: "beta@test.local", phone: "+961 1 200 002" });

    await page.getByPlaceholder(/search/i).first().fill("Alpha");

    await expect(tableRow(page, "Alpha One")).toBeVisible();
    await expect(tableRow(page, "Beta Two")).toHaveCount(0);
  });
});
