import { describe, it, expect } from "vitest";

import { can } from "../auth/permissions.js";
import { normalizeScopes } from "../db/repos/apiKeys.js";

// An API key must go through exactly the same permission checks as a person, with
// its own scope list as the source. These pin the three properties that make that
// safe rather than a second, weaker path into the data.

const key = (scopes) => ({
  id: null,
  name: "API key 7",
  role: "rep",
  permissions: {},
  isApiKey: true,
  apiKeyId: "7",
  apiKeyScopes: normalizeScopes(scopes),
});

describe("can() for an API key", () => {
  it("allows what its scopes allow", () => {
    expect(can(key(["deals:read"]), "deals", "view")).toBe(true);
    expect(can(key(["deals:read"]), "deals", "create")).toBe(false);
  });

  it("denies everything a key was not granted", () => {
    expect(can(key(["deals:read"]), "customers", "view")).toBe(false);
    expect(can(key([]), "deals", "view")).toBe(false);
    expect(can(key([]), "customers", "delete")).toBe(false);
  });

  it("treats write as implying read", () => {
    // A key that can create a deal can obviously fetch the list it just added to.
    // Otherwise every write-only integration would need a redundant read scope, and
    // people would grant one.
    expect(can(key(["deals:write"]), "deals", "view")).toBe(true);
    expect(can(key(["deals:write"]), "deals", "edit")).toBe(true);
    expect(can(key(["deals:write"]), "deals", "delete")).toBe(true);
  });

  it("never grants admin, whatever the scopes", () => {
    // The bypass at the top of `can` is what makes a key dangerous if it could
    // reach it: an admin ignores the permission table entirely, so a key that could
    // present as an admin would have no meaningful scope at all.
    const withEverything = key([
      "customers:read", "customers:write",
      "leads:read", "leads:write",
      "deals:read", "deals:write",
      "reports:read",
    ]);

    expect(withEverything.role).toBe("rep");
    // reports is not a CRM collection, so a scope names it directly.
    expect(can(withEverything, "reports", "view")).toBe(true);
    // And nothing invents access to a resource that was never named.
    expect(can(withEverything, "customers", "view")).toBe(true);
    expect(can(key(["reports:read"]), "customers", "view")).toBe(false);
  });

  it("leaves a real user's permissions untouched", () => {
    // The regression this guards: adding the key branch must not change what a
    // person can do, in either direction.
    const rep = { role: "rep", permissions: { deals: { view: "own", edit: true } } };

    expect(can(rep, "deals", "view")).toBe(true);
    expect(can(rep, "deals", "edit")).toBe(true);
    expect(can(rep, "deals", "delete")).toBe(false);
    expect(can(rep, "customers", "view")).toBe(false);

    const admin = { role: "admin", permissions: {} };
    expect(can(admin, "customers", "delete")).toBe(true);
  });

  it("does not treat an absent user as a key", () => {
    expect(can(undefined, "deals", "view")).toBe(false);
    expect(can(null, "deals", "view")).toBe(false);
    expect(can({}, "deals", "view")).toBe(false);
  });
});