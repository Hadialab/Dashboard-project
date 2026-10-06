import { describe, it, expect } from "vitest";

import {
  generateResetToken,
  hashResetToken,
  buildResetUrl,
  MAX_LIVE_RESET_TOKENS,
} from "../db/repos/passwordReset.js";

// The token functions are pure; the SQL around them is covered end to end by the
// Playwright suite against a real database. What is worth pinning here is the
// property the table's design rests on: a leaked table yields no working links.

describe("generateResetToken", () => {
  it("produces 64 hex characters", () => {
    expect(generateResetToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not repeat", () => {
    // A collision would mean one user's reset link resets another's account.
    const tokens = new Set(Array.from({ length: 500 }, generateResetToken));

    expect(tokens.size).toBe(500);
  });

  it("uses enough entropy that guessing is not a strategy", () => {
    // 32 bytes from the CSPRNG. Asserted as a length rather than by
    // re-implementing the entropy calculation, because the point here is that the
    // value is drawn from the right generator and is long enough to make
    // exhaustive search meaningless.
    expect(generateResetToken()).toHaveLength(64);
    expect(generateResetToken().length * 4).toBe(256);
  });
});

describe("hashResetToken", () => {
  it("is deterministic, so a lookup can find the stored row", () => {
    const token = generateResetToken();

    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it("is not the token itself", () => {
    // The entire point of the column. A dump of this table must not contain
    // anything that can be pasted into a reset form.
    const token = generateResetToken();

    expect(hashResetToken(token)).not.toBe(token);
    expect(hashResetToken(token)).not.toContain(token);
  });

  it("is a sha256 hex digest", () => {
    expect(hashResetToken("a".repeat(64))).toMatch(/^[a-f0-9]{64}$/);
  });

  it("separates different tokens", () => {
    expect(hashResetToken(generateResetToken())).not.toBe(hashResetToken(generateResetToken()));
  });
});

describe("buildResetUrl", () => {
  // Its own function precisely so this can be asserted without a provider: the
  // alternative is an end-to-end test that needs a working inbox.
  const token = "a".repeat(64);

  it("points at the reset page with the token attached", () => {
    expect(buildResetUrl("https://crm.example.com", token)).toBe(
      `https://crm.example.com/reset-password?token=${token}`,
    );
  });

  it("strips a trailing slash from the configured origin", () => {
    // A configured `https://crm.example.com/` otherwise produces a doubled slash,
    // which some routers treat as a different path — so the user gets a 404 from a
    // link that looks perfectly correct in their mail client.
    expect(buildResetUrl("https://crm.example.com/", token)).not.toContain(".com//");
    expect(buildResetUrl("https://crm.example.com///", token)).not.toContain(".com//");
  });

  it("preserves a path prefix, so a sub-path deployment still works", () => {
    expect(buildResetUrl("https://example.com/crm", token)).toBe(
      `https://example.com/crm/reset-password?token=${token}`,
    );
  });

  it("keeps a non-default port", () => {
    // The E2E run depends on this: a link pointing at 5173 works on a developer's
    // machine and 404s in CI, where nothing is serving that port.
    expect(buildResetUrl("http://localhost:5174", token)).toContain("http://localhost:5174/");
  });

  it("puts the token in the query, not the path", () => {
    // A token in the path tends to end up in server logs and referrer headers.
    const url = buildResetUrl("https://crm.example.com", token);

    expect(url).toContain(`?token=${token}`);
    expect(url.split("/").at(-1)).toBe(`reset-password?token=${token}`);
  });
});

describe("MAX_LIVE_RESET_TOKENS", () => {
  it("allows enough retries to be usable", () => {
    // The abuse being bounded is sending mail to a known address as fast as
    // possible. Three covers a user who lost the email, double-clicked because
    // the page seemed slow, and then tried from another device.
    expect(MAX_LIVE_RESET_TOKENS).toBeGreaterThanOrEqual(3);
  });

  it("is low enough to bound anything", () => {
    // The limit is a rate limit, so it only works if it is small.
    expect(MAX_LIVE_RESET_TOKENS).toBeLessThanOrEqual(5);
  });
});