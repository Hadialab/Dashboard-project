import { test, expect } from "@playwright/test";
import {
  signUp,
  signIn,
  gotoCustomers,
  gotoAudit,
  gotoTeam,
  createCustomer,
  deleteCustomer,
  addTeamMember,
  removeTeamMember,
  tableRow,
} from "./helpers";

/**
 * The audit log, end to end against a real API and a real database.
 *
 * The unit and integration suites can both be green while the log records nothing,
 * because that failure only shows up when a real mutation travels through the real
 * router to the real table. So what is asserted here is the wiring: a change made
 * through the UI appears in the log with its before and after values.
 *
 * Each test registers its own company, so the log starts empty and an assertion
 * about a specific entry is unambiguous.
 */

test.describe("audit log", () => {
  test("an administrator sees a created customer in the log", async ({ page }) => {
    await signUp(page);
    const email = `audit.create.${Date.now()}@test.local`;

    await gotoCustomers(page);
    await createCustomer(page, {
      name: "Audited Contact",
      company: "Audit Co",
      email,
      phone: "+961 1 999 000",
    });

    await gotoAudit(page);

    // The record is identifiable by its name and its id. The name is what makes
    // the log readable without looking records up; the id is what makes it
    // traceable after a rename.
    const row = page.getByRole("row").filter({ hasText: "Audited Contact" });
    await expect(row).toBeVisible();
    await expect(row.getByRole("button", { name: /c\d+/ })).toBeVisible();

    // The entry's field values, which only an entry written from the stored row
    // can carry.
    await row.getByRole("button", { name: /show changes/i }).click();
    await expect(row.getByText(email)).toBeVisible();
  });

  test("records what a value changed from, not just that it changed", async ({ page }) => {
    await signUp(page);
    const original = `audit.before.${Date.now()}@test.local`;
    const updated = `audit.after.${Date.now()}@test.local`;

    await gotoCustomers(page);
    await createCustomer(page, {
      name: "Renamed Contact",
      company: "Audit Co",
      email: original,
      phone: "+961 1 999 111",
    });

    // Reopen the record and change only the email address.
    await tableRow(page, "Renamed Contact").getByRole("button", { name: "Edit Renamed Contact" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/^email/i).fill(updated);
    await dialog.getByRole("button", { name: /save|update/i }).click();
    await expect(dialog).toBeHidden();

    await gotoAudit(page);

    // Both values, side by side. An audit log that stored only the new value would
    // answer "it is this now" and not "what was it before" — which is the question
    // it exists to answer.
    const changed = page.getByRole("row").filter({ hasText: "Changed" });
    await changed.getByRole("button", { name: /show changes/i }).first().click();
    await expect(changed.getByText(new RegExp(original))).toBeVisible();
    await expect(changed.getByText(new RegExp(updated))).toBeVisible();
  });

  test("does not record an entry for a save that changed nothing", async ({ page }) => {
    await signUp(page);
    // Deliberately not a name containing "Changed": the assertions below filter
    // rows by that word, and the record's own name appears in the row text.
    const name = "Untouched Contact";

    await gotoCustomers(page);
    await createCustomer(page, {
      name,
      company: "Audit Co",
      email: `audit.same.${Date.now()}@test.local`,
      phone: "+961 1 999 222",
    });

    // Open and re-save without editing anything. The frontend submits the whole
    // row on every save, so this is the common case, and logging it would bury
    // real changes under phantom ones.
    await tableRow(page, name).getByRole("button", { name: `Edit ${name}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /save|update/i }).click();
    await expect(dialog).toBeHidden();

    await gotoAudit(page);

    // One entry only: the create. The edit/submit pair is two actions on the page
    // but one PUT to the API, and it changed nothing — so the log should be
    // silent about it.
    await expect(page.getByRole("row").filter({ hasText: "Created" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "Changed" })).toHaveCount(0);
  });

  test("filters to one record and excludes the rest", async ({ page }) => {
    await signUp(page);

    await gotoCustomers(page);
    await createCustomer(page, {
      name: "First Audited",
      company: "Audit Co",
      email: `audit.one.${Date.now()}@test.local`,
      phone: "+961 1 999 333",
    });
    await createCustomer(page, {
      name: "Second Audited",
      company: "Audit Co",
      email: `audit.two.${Date.now()}@test.local`,
      phone: "+961 1 999 444",
    });

    await gotoAudit(page);

    const firstRow = page.getByRole("row").filter({ hasText: "First Audited" });
    const secondRow = page.getByRole("row").filter({ hasText: "Second Audited" });
    await expect(secondRow).toBeVisible();

    // Read the id off the row rather than assuming it. The id sequence is shared
    // across every company in the database, so the first record a fresh test
    // company creates is c001 only on a freshly reset database — not in CI, where
    // the suite shares one and earlier tests have already consumed numbers.
    const firstId = await firstRow.getByRole("button", { name: /c\d+/ }).textContent();
    expect(firstId).toMatch(/^c\d+$/);

    await page.getByRole("combobox", { name: /what/i }).selectOption("customer");
    await page.getByRole("searchbox", { name: /record id/i }).fill(firstId);

    // A filter that worked shows the one record and drops the other. Both halves
    // matter: a filter that matched everything would pass the first assertion.
    await expect(firstRow).toBeVisible();
    await expect(secondRow).toHaveCount(0);
  });

  test("keeps a deleted record's entry, with its values", async ({ page }) => {
    await signUp(page);
    // Not a name containing "Deleted": the assertion below filters rows by that
    // word, and the record's own name appears in its row.
    const name = "Removed Contact";
    const email = `audit.deleted.${Date.now()}@test.local`;

    await gotoCustomers(page);
    await createCustomer(page, { name, company: "Audit Co", email, phone: "+961 1 999 555" });

    // Deletes and confirms in the modal — the row's trash button alone does
    // nothing, so both steps live in the helper.
    await deleteCustomer(page, name);

    await gotoAudit(page);

    // The point of capturing the prior values: once the row is gone, "someone
    // deleted c041" is much weaker than the same entry plus the name and email
    // that were removed. The name is still readable because it is denormalised
    // onto the row rather than looked up from a table the entry no longer exists in.
    const deleted = page.getByRole("row").filter({ hasText: "Deleted" });
    await expect(deleted).toHaveCount(1);
    await expect(deleted.getByText(name)).toBeVisible();

    await deleted.getByRole("button", { name: /show changes/i }).click();
    await expect(deleted.getByText(email)).toBeVisible();
  });

  test("records the permissions granted to a new team member", async ({ page }) => {
    await signUp(page);

    await gotoTeam(page);
    await addTeamMember(page, {
      name: "New Hire",
      email: `audit.hire.${Date.now()}@test.local`,
      password: "hiretest12345",
    });

    await gotoAudit(page);

    // A permission grant is the one change where "who did this, and what did they
    // change it from" has to survive the account being deleted afterwards.
    const access = page.getByRole("row").filter({ hasText: "Access changed" });
    await expect(access).toBeVisible();
    await access.getByRole("button", { name: /show changes/i }).first().click();
    await expect(access.getByText(/permissions/).first()).toBeVisible();
  });

  test("is not offered to a sales user, and refuses the page when they force it", async ({ page }) => {
    const company = await signUp(page);

    // A real rep in this company, rather than registering a second one: register
    // always makes an admin, so that would test nothing.
    await gotoTeam(page);
    await addTeamMember(page, {
      name: "Audit Rep",
      email: company.rep.email,
      password: company.rep.password,
    });

    await page.getByRole("button", { name: /log out|sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await signIn(page, company.rep);

    // The sidebar link is hidden for a rep.
    await expect(page.getByRole("link", { name: "Audit Log", exact: true })).toHaveCount(0);

    // And going there directly explains the refusal rather than showing a 403 or,
    // worse, the log itself. Matched on the heading, which is stable; the
    // supporting sentence is copy and would break on a reword.
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: /for administrators/i })).toBeVisible();

    // No rows at all: a rep must not see another employee's activity, and not even
    // an empty table that could be mistaken for "nothing happened yet".
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("row")).toHaveCount(0);

    // And the filter bar is not rendered either — offering filters for a log that
    // cannot be read is just a row of dead controls.
    await expect(page.getByRole("combobox", { name: /who/i })).toHaveCount(0);
  });

  test("keeps a removed account's name on the entries they wrote", async ({ page }) => {
    const company = await signUp(page);

    await gotoTeam(page);
    await addTeamMember(page, {
      name: "Departing Rep",
      email: company.rep.email,
      password: company.rep.password,
    });

    // The departing rep has to have *done* something. An entry naming them as the
    // target of someone else's action says nothing about what happens to their own
    // entries when their account goes — actor_id becomes null, and only the
    // denormalised name is left.
    await page.getByRole("button", { name: /log out|sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await signIn(page, company.rep);

    await gotoCustomers(page);
    await createCustomer(page, {
      name: "Rep Created This",
      company: "Audit Co",
      email: `audit.repwork.${Date.now()}@test.local`,
      phone: "+961 1 999 666",
    });

    await page.getByRole("button", { name: /log out|sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await signIn(page, company.admin);

    await gotoTeam(page);
    await removeTeamMember(page, "Departing Rep");

    await gotoAudit(page);

    // Their own entry survives them, attributed by name, and says plainly that the
    // account is gone rather than rendering a blank actor.
    const theirWork = page
      .getByRole("row")
      .filter({ hasText: "account removed" })
      .filter({ hasText: "Departing Rep" });

    await expect(theirWork).toHaveCount(1);
    await expect(theirWork.getByText("Rep Created This")).toBeVisible();

    // And they remain filterable in the actor dropdown, by name, because their id
    // no longer exists. A dropdown built from live user ids would drop them here.
    const actorFilter = page.getByRole("combobox", { name: /who/i });
    await expect(actorFilter.getByRole("option", { name: /departing rep/i })).toHaveCount(1);
  });
});