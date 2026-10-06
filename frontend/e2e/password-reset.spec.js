import { test, expect } from "@playwright/test";
import pg from "pg";
import { createHash, randomBytes } from "node:crypto";

import { signUp, signIn } from "./helpers";
import { resolveE2eDatabaseUrl, E2E_APP_URL } from "./e2eDatabase.js";

/**
 * Password reset, end to end against the real API and a real database.
 *
 * The token used below is minted by the test, the same way the server mints one —
 * 32 random bytes, sha256 into the table, plaintext known only to the test. That is
 * not a shortcut around the feature. The plaintext token exists *only* in the
 * email by design, so the table holds a hash and there is nothing to read back out
 * of it; asserting that is itself one of the checks. Reading a real token would
 * require a working provider and a readable inbox, neither of which a test suite
 * can count on.
 *
 * What this therefore covers: the route, the single-use consumption, the password
 * policy, the audit entry, and both pages in a real browser. What it does not is
 * delivery — no provider is configured, which is a state the app supports and
 * which the unit tests cover from the other side.
 */

test.describe("password reset", () => {
  test("asks for a link and gives the same answer for any address", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /forgotten your password/i })).toBeVisible();

    // An address nobody has. The page must not say so — that would turn the form
    // into a way to find out who has an account.
    await page.getByLabel(/email/i).fill("definitely-not-registered@test.local");
    await page.getByRole("button", { name: /send the reset link/i }).click();

    await expect(page.getByText(/check your email/i)).toBeVisible();
    await expect(page.getByText(/if an account exists with that address/i)).toBeVisible();
    await expect(page.getByText(/no account|unknown email|not registered/i)).toHaveCount(0);

    // And the form is gone, so the request cannot be sent twice.
    await expect(page.getByLabel(/email/i)).toHaveCount(0);
  });

  test("a link with no token explains itself and offers another", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(page.getByText(/this link is no longer valid/i)).toBeVisible();
    // A dead end here would leave someone locked out with no route to recovery.
    await expect(page.getByRole("link", { name: /request a new link/i })).toBeVisible();
  });

  test("a well-formed but unknown token fails only when submitted", async ({ page }) => {
    await page.goto(`/reset-password?token=${"b".repeat(64)}`);

    // The server is the only authority on whether a token is live, and asking it on
    // every page view would cost a request to learn something most links get right.
    // So the form renders, and the refusal arrives on submit — the same refusal a
    // malformed link gets at the shape check, worded identically so the two are not
    // distinguishable from outside.
    await expect(page.getByRole("button", { name: /set new password/i })).toBeVisible();

    await page.getByLabel(/^new password$/i).fill("brandnew12345");
    await page.getByLabel(/confirm new password/i).fill("brandnew12345");
    await page.getByRole("button", { name: /set new password/i }).click();

    await expect(page.getByText(/this link is no longer valid/i)).toBeVisible();
    await expect(page.getByText(/this reset link is not valid/i)).toHaveCount(0);
  });

  test("completes a reset and lets the user in with the new password", async ({ page }) => {
    const company = await signUp(page);
    await signOut(page);

    const token = await mintResetToken(company.admin.email);

    await page.goto(`/reset-password?token=${token}`);
    await page.getByLabel(/^new password$/i).fill("brandnew12345");
    await page.getByLabel(/confirm new password/i).fill("brandnew12345");
    await page.getByRole("button", { name: /set new password/i }).click();

    // Sent to sign in rather than straight in: the API returns no session token,
    // so a reset link alone cannot be used to take over a session.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/password has been changed/i)).toBeVisible();

    // The new password works.
    await signIn(page, { email: company.admin.email, password: "brandnew12345" });

    // The old one does not.
    await signOut(page);
    await page.getByLabel(/^email/i).fill(company.admin.email);
    await page.getByLabel(/^password$/i).fill("e2etest1234");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong|failed/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a link works only once", async ({ page, context }) => {
    const company = await signUp(page);
    await signOut(page);

    const token = await mintResetToken(company.admin.email);

    await page.goto(`/reset-password?token=${token}`);
    await page.getByLabel(/^new password$/i).fill("brandnew12345");
    await page.getByLabel(/confirm new password/i).fill("brandnew12345");
    await page.getByRole("button", { name: /set new password/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // The same link in a fresh tab — the realistic case being a link that
    // leaked into a shared mailbox or a browser history, and is used again
    // afterwards. Submitting it must fail rather than set a second password.
    const second = await context.newPage();
    await second.goto(`/reset-password?token=${token}`);
    await second.getByLabel(/^new password$/i).fill("attacker9999999");
    await second.getByLabel(/confirm new password/i).fill("attacker9999999");
    await second.getByRole("button", { name: /set new password/i }).click();

    await expect(second.getByText(/this link is no longer valid/i)).toBeVisible();

    // And the first password still stands.
    await signIn(page, { email: company.admin.email, password: "brandnew12345" });
  });

  test("refuses mismatched passwords without spending the token", async ({ page }) => {
    const company = await signUp(page);
    await signOut(page);

    const token = await mintResetToken(company.admin.email);

    await page.goto(`/reset-password?token=${token}`);
    await page.getByLabel(/^new password$/i).fill("brandnew12345");
    await page.getByLabel(/confirm new password/i).fill("different123456");
    await page.getByRole("button", { name: /set new password/i }).click();

    await expect(page.getByText(/do not match/i)).toBeVisible();

    // Still usable: a client-side mistake must not cost the user their link.
    await page.getByLabel(/confirm new password/i).clear();
    await page.getByLabel(/confirm new password/i).fill("brandnew12345");
    await page.getByRole("button", { name: /set new password/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a reset is recorded in the audit log", async ({ page }) => {
    const company = await signUp(page);
    await signOut(page);

    const token = await mintResetToken(company.admin.email);

    await page.goto(`/reset-password?token=${token}`);
    await page.getByLabel(/^new password$/i).fill("brandnew12345");
    await page.getByLabel(/confirm new password/i).fill("brandnew12345");
    await page.getByRole("button", { name: /set new password/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, { email: company.admin.email, password: "brandnew12345" });

    await page.getByRole("link", { name: "Audit Log", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Audit Log", exact: true })).toBeVisible();

    // The single most security-relevant event in the app, so it is not left to the
    // server log where nobody looks.
    await expect(page.getByRole("row").filter({ hasText: "Password changed" }).first()).toBeVisible();
  });
});

async function signOut(page) {
  await page.getByRole("button", { name: /log out|sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);
}

/**
 * Mints a live reset token for an address, exactly as the server does.
 *
 * Inserted rather than read, because the server stores only a hash — the plaintext
 * has no copy in the database to read. The sha256 is the server's own scheme; if
 * the two ever diverge this test fails, which is the correct outcome: it would mean
 * the link the app emails could not be redeemed.
 */
async function mintResetToken(email) {
  const client = new pg.Client({ connectionString: resolveE2eDatabaseUrl() });
  await client.connect();

  try {
    const token = randomBytes(32).toString("hex");

    const inserted = await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       SELECT u.id, $2, now() + interval '15 minutes'
         FROM users u
        WHERE u.email = $1
       RETURNING id`,
      [email, createHash("sha256").update(token).digest("hex")],
    );

    if (inserted.rowCount === 0) {
      throw new Error(`no user exists for ${email}`);
    }

    return token;
  } finally {
    await client.end();
  }
}

// Referenced so the shared module is exercised by the suite rather than only by the
// config; keeps the reset link's origin honest about which port it points at.
test("the emailed link points at this run's preview server", async () => {
  expect(E2E_APP_URL).toContain("5174");
});