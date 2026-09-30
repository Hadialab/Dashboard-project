import { test, expect } from "@playwright/test";

/**
 * Shared E2E helpers.
 *
 * Every test runs against its own freshly registered company. That is deliberate
 * rather than convenient: it means the tests need no cleanup step, cannot
 * interfere with each other, and exercise the real signup path on the way in.
 * A run leaves behind some throwaway companies, which is the cost.
 */

let counter = 0;

/** A unique company per call, so a re-run never collides on the email. */
export function uniqueCompany() {
  counter += 1;
  const stamp = `${Date.now()}${counter}`;

  return {
    name: `E2E ${stamp}`,
    admin: { name: "E2E Admin", email: `e2e.admin.${stamp}@test.local`, password: "e2etest1234" },
    rep: { name: "E2E Rep", email: `e2e.rep.${stamp}@test.local`, password: "e2etest1234" },
  };
}

/** Registers the admin and lands on the dashboard. */
export async function signUp(page) {
  const company = uniqueCompany();

  await page.goto("/register");
  await page.getByLabel(/company name/i).fill(company.name);
  await page.getByLabel(/full name/i).fill(company.admin.name);
  await page.getByLabel(/^email/i).fill(company.admin.email);
  await page.getByLabel(/^password$/i).fill(company.admin.password);
  // The form has a separate confirmation field. Leaving it empty blocks the
  // submit, which looks like a broken signup rather than a missed field.
  await page.getByLabel(/confirm password/i).fill(company.admin.password);

  await page.getByRole("button", { name: /create account|sign up|get started/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

  return company;
}

/** Signs in with credentials from a company made by signUp. */
export async function signIn(page, credentials) {
  await page.goto("/login");
  await page.getByLabel(/^email/i).fill(credentials.email);
  await page.getByLabel(/^password$/i).fill(credentials.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

/**
 * The table renders a desktop row layout and a mobile card layout from the same
 * data, so a name legitimately appears twice in the DOM. Anything that needs one
 * match is scoped to the table.
 */
export function tableRow(page, name) {
  return page.getByRole("table").getByRole("row").filter({ hasText: name });
}

export async function gotoCustomers(page) {
  await page.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/customers/);
}

export async function gotoLeads(page) {
  await page.getByRole("link", { name: "Leads", exact: true }).click();
  await expect(page).toHaveURL(/\/leads/);
}

export async function gotoPipeline(page) {
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page).toHaveURL(/\/pipeline/);
}

/** Fills the add-customer dialog and submits it. */
export async function createCustomer(page, { name, company, email, phone }) {
  await page.getByRole("button", { name: /add customer/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel(/full name/i).fill(name);
  await dialog.getByLabel(/company/i).fill(company);
  await dialog.getByLabel(/email/i).fill(email);
  await dialog.getByLabel(/phone/i).fill(phone);
  await dialog.getByRole("button", { name: /^add customer$/i }).click();

  await expect(dialog).toBeHidden();
}

/** Fills the add-lead dialog and submits it. */
export async function createLead(page, { name, company, email, phone }) {
  await page.getByRole("button", { name: /add lead/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel(/full name/i).fill(name);
  await dialog.getByLabel(/company/i).fill(company);
  await dialog.getByLabel(/email/i).fill(email);
  await dialog.getByLabel(/phone/i).fill(phone);
  await dialog.getByRole("button", { name: /add lead/i }).click();

  await expect(dialog).toBeHidden();
}
