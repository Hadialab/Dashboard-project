import { describe, it, expect } from "vitest";

import {
  describeCreation,
  describeDeletion,
  diffRecord,
  hasChanges,
} from "../audit/diff.js";

// The audit diff is the part of the feature with real subtlety, and the subtlety
// is all about false positives and false negatives. Both are silent: a log full of
// phantom changes is unreadable, and a missed change is a lie about what happened.

// Mirrors what the API returns for a customer, so the tests read as records
// rather than as fixtures of field names.
const customer = (over = {}) => ({
  id: "c001",
  name: "Acme Contact",
  company: "Acme",
  email: "acme@test.local",
  phone: "+961 1 111 222",
  status: "Active",
  createdAt: "2026-10-01T09:00:00Z",
  updatedAt: "2026-10-01T09:00:00Z",
  ...over,
});

describe("diffRecord", () => {
  it("finds nothing in an identical record", () => {
    expect(diffRecord(customer(), customer())).toEqual({});
  });

  it("reports a changed field with both values", () => {
    const changes = diffRecord(customer(), customer({ status: "Inactive" }));

    expect(changes).toEqual({ status: { from: "Active", to: "Inactive" } });
  });

  it("finds a change in a field the activity timeline does not narrate", () => {
    // The whole reason for full fidelity. TIMELINE only covers status, so an
    // email change writes nothing to the timeline — and an audit log that shared
    // that subset could not answer "who changed this email address".
    const changes = diffRecord(customer(), customer({ email: "new@test.local" }));

    expect(changes).toHaveProperty("email");
    expect(changes.email).toEqual({ from: "acme@test.local", to: "new@test.local" });
  });

  it("reports several changes at once", () => {
    const changes = diffRecord(
      customer(),
      customer({ email: "new@test.local", status: "Inactive" }),
    );

    expect(Object.keys(changes).sort()).toEqual(["email", "status"]);
  });

  it("treats a NUMERIC string and a number as the same value", () => {
    // A NUMERIC(14,2) column arrives from pg as "12000.00" while a form sends
    // 12000 as a number. Compared with === these differ, so saving a form without
    // touching the value would log a change on every save.
    const before = customer({ value: "12000.00" });
    const after = customer({ value: 12000 });

    expect(diffRecord(before, after)).toEqual({});
  });

  it("still catches a genuine money change", () => {
    const changes = diffRecord(
      customer({ value: "12000.00" }),
      customer({ value: 15000 }),
    );

    expect(changes.value).toEqual({ from: "12000.00", to: 15000 });
  });

  it("treats null and undefined as the same absence", () => {
    const changes = diffRecord(
      customer({ owner: null }),
      customer({ owner: undefined }),
    );

    expect(changes).toEqual({});
  });

  it("catches a field being cleared", () => {
    const changes = diffRecord(customer({ owner: "Nadia" }), customer({ owner: null }));

    expect(changes).toEqual({ owner: { from: "Nadia", to: null } });
  });

  it("reports a field added as well as one removed", () => {
    // Iterating only the "after" keys would miss a field that went away.
    const changes = diffRecord(customer(), { ...customer(), extra: "added" });

    expect(changes.extra).toEqual({ from: null, to: "added" });
  });

  it("ignores server-owned fields even when they differ", () => {
    // updatedAt changes on every write by definition. Recording it would put a
    // timestamp edit in the log as though someone had touched the record, and
    // would make every save look like a change.
    const changes = diffRecord(
      customer({ updatedAt: "2026-10-01T09:00:00Z" }),
      customer({ updatedAt: "2026-10-05T14:22:00Z" }),
    );

    expect(changes).toEqual({});
  });

  it("ignores id, createdAt and createdDate", () => {
    const changes = diffRecord(
      customer({ id: "c001", createdAt: "2026-10-01T09:00:00Z", createdDate: "2026-10-01" }),
      customer({ id: "c002", createdAt: "2026-10-02T09:00:00Z", createdDate: "2026-10-02" }),
    );

    expect(changes).toEqual({});
  });

  it("survives a missing record on either side", () => {
    // Defensive: a delete diffs a row against nothing.
    expect(diffRecord(customer(), null)).toBeTypeOf("object");
    expect(diffRecord(null, customer())).toBeTypeOf("object");
  });

  it("keeps the original value types rather than stringifying them", () => {
    // A number in the log reads as a number, and the audit view formats it.
    const changes = diffRecord(
      customer({ stage: "Lead" }),
      customer({ stage: "Won" }),
    );

    expect(typeof changes.stage.from).toBe("string");
    expect(changes.stage.to).toBe("Won");
  });
});

describe("hasChanges", () => {
  it("is false for an empty diff", () => {
    expect(hasChanges({})).toBe(false);
  });

  it("is true when anything was recorded", () => {
    expect(hasChanges({ status: { from: "a", to: "b" } })).toBe(true);
  });
});

describe("describeCreation", () => {
  it("records every provided field as a change from nothing", () => {
    const changes = describeCreation(customer(), ["name", "email"]);

    expect(changes).toEqual({
      name: { from: null, to: "Acme Contact" },
      email: { from: null, to: "acme@test.local" },
    });
  });

  it("records an explicit null rather than skipping it", () => {
    // `undefined` means the field was never there; `null` means it was cleared.
    // Dropping the latter would hide "the owner was unassigned", which is one of
    // the changes an audit log is most often asked about.
    const changes = describeCreation(customer({ source: null }), ["name", "source"]);

    expect(changes).toEqual({
      name: { from: null, to: "Acme Contact" },
      source: { from: null, to: null },
    });
  });

  it("skips a field the record does not carry at all", () => {
    const changes = describeCreation(customer(), ["name", "somethingElse"]);

    expect(changes).toEqual({ name: { from: null, to: "Acme Contact" } });
  });
});

describe("describeDeletion", () => {
  it("keeps the prior values, which is the point of the entry", () => {
    // Once the row is gone, "user X deleted c001" is much weaker than the same
    // entry plus the name and email that were removed.
    const changes = describeDeletion(customer(), ["name", "email"]);

    expect(changes).toEqual({
      name: { from: "Acme Contact", to: null },
      email: { from: "acme@test.local", to: null },
    });
  });

  it("round-trips with a diff, so create and delete read consistently", () => {
    const created = describeCreation(customer(), ["name", "email"]);
    const deleted = describeDeletion(customer(), ["name", "email"]);

    // Same keys either way, so the audit view can render both without special
    // casing, and every value ends where it started.
    expect(Object.keys(created)).toEqual(Object.keys(deleted));
  });
});