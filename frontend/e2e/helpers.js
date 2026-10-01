import { expect } from "@playwright/test";

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

/**
 * Navigates to a page and waits for it to have actually rendered.
 *
 * Waiting on the URL alone is not enough. Pages are lazy-loaded, so the URL
 * changes while the previous page is still mounted — and on a slow runner that
 * previous page is still in the DOM when the test's first assertion runs. That
 * produces failures that look like the wrong thing entirely: a strict-mode
 * violation against a Dashboard chart when testing the Pipeline, or a locator
 * timing out on an element that has not mounted yet.
 *
 * So each helper waits for the page's own heading. That proves the lazy chunk
 * loaded and the new tree committed.
 */
const PAGE_HEADINGS = {
  customers: "Customers",
  leads: "Leads",
  deals: "Deals",
  pipeline: "Pipeline",
};

async function gotoPage(page, key, navName) {
  await page.getByRole("link", { name: navName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${key}`));
  await expect(page.getByRole("heading", { name: PAGE_HEADINGS[key], exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

export async function gotoCustomers(page) {
  await gotoPage(page, "customers", "Customers");
}

export async function gotoLeads(page) {
  await gotoPage(page, "leads", "Leads");
}

export async function gotoPipeline(page) {
  await gotoPage(page, "pipeline", "Pipeline");
}

export async function gotoDeals(page) {
  await gotoPage(page, "deals", "Deals");
}

/**
 * Creates a deal from the Deals page.
 *
 * The Leads page has no "Add Deal" control — a deal is opened from a customer or
 * a lead — so this goes via the Deals page, which is where the app actually
 * offers the action. Expected close is required and has no default, so it has to
 * be filled or the form silently refuses to submit.
 *
 * Waits for the title to land in the list before returning, for the same reason
 * createCustomer does: the dialog closing is not the row arriving.
 */
export async function createDeal(page, { title, customer, value = "5000", expectedClose }) {
  await gotoDeals(page);
  await page.getByRole("button", { name: /add deal/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel(/deal title/i).fill(title);
  if (customer) await dialog.getByLabel(/^customer/i).fill(customer);
  await dialog.getByLabel(/deal value/i).fill(value);
  await dialog.getByLabel(/expected close/i).fill(
    expectedClose ?? new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  );
  await dialog.getByRole("button", { name: /^add deal$/i }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
}

/**
 * The draggable card element for a deal.
 *
 * Deliberately the `[draggable]` element rather than the text inside it. HTML5
 * drag-and-drop has to start on the draggable node itself; dispatching from a
 * child does not initiate a native drag, so a text locator silently drags
 * nothing and the drop never lands.
 */
export function dealCard(page, title) {
  return page.locator('[draggable="true"]').filter({ hasText: title });
}

/** A board column, addressed by its accessible name. */
export function stageColumn(page, stage) {
  return page.getByRole("region", { name: new RegExp(`^${stage} stage`) });
}

/**
 * Drags a deal card onto a stage column.
 *
 * The drag events are dispatched explicitly with a shared DataTransfer rather
 * than driven through the mouse. The board's handler calls
 * `dataTransfer.setData` in dragstart, and a synthesised pointer drag does not
 * reliably give the event a live DataTransfer — so the drag starts, the handler
 * throws, and the drop silently never lands. Dispatching the sequence directly
 * is deterministic and still exercises the app's real handlers.
 */
export async function dragDealToStage(page, title, stage) {
  const card = dealCard(page, title);
  const target = stageColumn(page, stage);

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

  await card.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer });
  await target.dispatchEvent("drop", { dataTransfer });
  await card.dispatchEvent("dragend", { dataTransfer });
}

/**
 * Fills the add-customer dialog and submits it.
 *
 * Waits for the new row to appear rather than only for the dialog to close. The
 * two are not the same thing: the dialog closes the moment the POST is sent, and
 * the list only re-renders once the response lands and the refetch completes. A
 * test that returns at dialog-close and immediately looks for the row therefore
 * races the network — which passes on a fast laptop and fails on a cold CI
 * runner, and does so as an apparently random failure in a test that has nothing
 * wrong with it.
 */
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

  // The refetch is the thing being waited on. Generous, because it is a round
  // trip to a real database and the suite runs against a cold Postgres in CI.
  await expect(tableRow(page, name)).toBeVisible({ timeout: 15_000 });
}

/** Fills the add-lead dialog and submits it. Waits for the row, as createCustomer does. */
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
  await expect(tableRow(page, name)).toBeVisible({ timeout: 15_000 });
}
