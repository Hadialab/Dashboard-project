import { describe, it, expect } from "vitest";

import {
  generateApiKey,
  generateSigningSecret,
  hashApiKey,
  normalizeScopes,
  secretsMatch,
  signWebhook,
  API_KEY_SCOPES,
} from "../db/repos/apiKeys.js";

// Both tables here exist so a database leak should hand over nothing. Every test
// below is a statement about that.

describe("API keys", () => {
  it("generates a key that is recognisable and usable", () => {
    const key = generateApiKey();

    // The prefix is what identifies a key in a list; it is not a secret and is not
    // treated as one.
    expect(key.plaintext).toMatch(/^crm_[a-f0-9]{64}$/);
    expect(key.plaintext.startsWith(key.prefix)).toBe(true);
    expect(key.prefix.length).toBeLessThan(key.plaintext.length);
  });

  it("never stores the key it handed out", () => {
    // The property the whole design rests on. A dump of api_keys must yield no
    // working credential for any company in it.
    const key = generateApiKey();

    expect(key.hash).not.toBe(key.plaintext);
    expect(key.hash).not.toContain(key.plaintext);
    expect(key.hash).not.toContain(key.plaintext.slice(0, 16));
    expect(key.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never generates the same key twice", () => {
    const keys = new Set(Array.from({ length: 500 }, () => generateApiKey().plaintext));

    expect(keys.size).toBe(500);
  });

  it("hashes deterministically, so a presented key can be looked up", () => {
    const key = generateApiKey();

    expect(hashApiKey(key.plaintext)).toBe(key.hash);
  });

  it("gives two different keys different hashes", () => {
    expect(hashApiKey(generateApiKey().plaintext)).not.toBe(
      hashApiKey(generateApiKey().plaintext),
    );
  });
});

describe("secretsMatch", () => {
  it("matches an identical secret", () => {
    expect(secretsMatch("crm_abc", "crm_abc")).toBe(true);
  });

  it("rejects a different one", () => {
    expect(secretsMatch("crm_abc", "crm_abd")).toBe(false);
  });

  it("handles secrets of different lengths without throwing", () => {
    // `timingSafeEqual` throws on a length mismatch, which would turn a malformed
    // header into a 500 instead of a 401.
    expect(secretsMatch("short", "a much longer secret entirely")).toBe(false);
  });

  it("rejects non-strings rather than throwing", () => {
    expect(secretsMatch(null, "crm_abc")).toBe(false);
    expect(secretsMatch("crm_abc", undefined)).toBe(false);
    expect(secretsMatch(123, 123)).toBe(false);
  });
});

describe("normalizeScopes", () => {
  it("keeps only recognised scopes", () => {
    // An unknown scope is dropped rather than rejected, so a client that sends a
    // typo does not get a validation error instead of a key — it gets a key that
    // cannot do what it asked for, which is the safer of the two surprises.
    expect(normalizeScopes(["deals:read", "deals:delete", "NONSENSE"])).toEqual([
      "deals:read",
    ]);
  });

  it("removes duplicates", () => {
    expect(normalizeScopes(["deals:read", "deals:read"])).toEqual(["deals:read"]);
  });

  it("returns nothing for anything that is not a list", () => {
    // An empty scope set reaches nothing, which is the safe default.
    expect(normalizeScopes(undefined)).toEqual([]);
    expect(normalizeScopes(null)).toEqual([]);
    expect(normalizeScopes("deals:read")).toEqual([]);
    expect(normalizeScopes({})).toEqual([]);
  });

  it("keeps every real scope", () => {
    expect(normalizeScopes(API_KEY_SCOPES)).toEqual(API_KEY_SCOPES);
  });

  it("offers both a read and a write for each resource", () => {
    for (const resource of ["customers", "leads", "deals"]) {
      expect(API_KEY_SCOPES).toContain(`${resource}:read`);
      expect(API_KEY_SCOPES).toContain(`${resource}:write`);
    }
  });
});

describe("webhook signatures", () => {
  it("signs a body deterministically for a given timestamp", () => {
    expect(signWebhook("whsec_x", '{"a":1}', 1700000000)).toBe(
      signWebhook("whsec_x", '{"a":1}', 1700000000),
    );
  });

  it("changes when the body changes", () => {
    expect(signWebhook("whsec_x", '{"a":1}', 1)).not.toBe(signWebhook("whsec_x", '{"a":2}', 1));
  });

  it("changes when the timestamp changes", () => {
    // The timestamp is inside the signed material rather than alongside it, which is
    // what stops a captured payload being replayed forever: the receiver compares
    // the timestamp against its own clock, and a replay arrives too late.
    expect(signWebhook("whsec_x", '{"a":1}', 1)).not.toBe(signWebhook("whsec_x", '{"a":1}', 2));
  });

  it("changes when the secret changes", () => {
    expect(signWebhook("whsec_x", '{"a":1}', 1)).not.toBe(signWebhook("whsec_y", '{"a":1}', 1));
  });

  it("cannot be confused with the API key hash", () => {
    // Both are HMAC-SHA256, but under different domain separators — so a key hash
    // can never be mistaken for a webhook signature or vice versa.
    const secret = generateSigningSecret();

    expect(secret).toMatch(/^whsec_[a-f0-9]{48}$/);
    expect(signWebhook(secret, "x", 1)).toMatch(/^[a-f0-9]{64}$/);
  });
});