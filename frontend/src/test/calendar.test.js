import { describe, it, expect, beforeEach } from "vitest";

import {
  buildMailtoForFollowUp,
  followUpTypeLabel,
  isOverdue,
  downloadIcsForFollowUp,
} from "../utils/calendar";
import { generatedFiles } from "./setup";

const followUp = (over = {}) => ({
  id: "f001",
  title: "Send revised quote",
  type: "email",
  dueAt: "2026-10-03",
  details: "Quote for the Beirut rollout.",
  status: "pending",
  createdByName: "QA Admin",
  createdByEmail: "qa@example.com",
  ...over,
});

describe("followUpTypeLabel", () => {
  it("labels each known type", () => {
    expect(followUpTypeLabel("call")).toBe("Call");
    expect(followUpTypeLabel("email")).toBe("Email");
    expect(followUpTypeLabel("meeting")).toBe("Meeting");
    expect(followUpTypeLabel("task")).toBe("Task");
  });

  it("falls back to Task rather than rendering undefined", () => {
    expect(followUpTypeLabel("carrier-pigeon")).toBe("Task");
    expect(followUpTypeLabel(undefined)).toBe("Task");
  });
});

describe("isOverdue", () => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  it("is true for a past date still pending", () => {
    expect(isOverdue(followUp({ dueAt: yesterday, status: "pending" }))).toBe(true);
  });

  it("is false for a completed follow-up, however late it is", () => {
    expect(isOverdue(followUp({ dueAt: yesterday, status: "done" }))).toBe(false);
  });

  it("is false for today and for the future", () => {
    expect(isOverdue(followUp({ dueAt: today, status: "pending" }))).toBe(false);
    expect(isOverdue(followUp({ dueAt: tomorrow, status: "pending" }))).toBe(false);
  });
});

describe("buildMailtoForFollowUp", () => {
  const contact = { name: "Nadine C", email: "nadine@example.com" };

  it("addresses the contact and encodes subject and body", () => {
    const link = buildMailtoForFollowUp(followUp(), contact);

    expect(link.startsWith("mailto:nadine@example.com?")).toBe(true);
    expect(link).toContain(`subject=${encodeURIComponent("Follow-up: Send revised quote")}`);
    // The body must be encoded or the newlines break the link.
    expect(link).toContain("body=");
    expect(link).not.toContain("\n");
  });

  it("returns null with no contact email, rather than a broken mailto:", () => {
    expect(buildMailtoForFollowUp(followUp(), null)).toBeNull();
    expect(buildMailtoForFollowUp(followUp(), { name: "No Email" })).toBeNull();
  });

  it("still produces a usable subject with no details", () => {
    const link = buildMailtoForFollowUp(followUp({ details: "" }), contact);

    expect(link).toContain("subject=");
  });
});

describe("downloadIcsForFollowUp", () => {
  beforeEach(() => {
    generatedFiles.length = 0;
  });

  /** Reads the generated .ics back out of the captured blob. */
  async function icsText() {
    return generatedFiles[generatedFiles.length - 1].blob.text();
  }

  /**
   * Reverses line folding so assertions can be written against whole values.
   * A folded line is a presentational split, so matching across one would be
   * testing the wrapping rather than the content.
   */
  const unfold = (text) => text.replace(/\r\n /g, "");

  it("builds a valid VCALENDAR with one event", async () => {
    await downloadIcsForFollowUp(followUp());
    const text = await icsText();

    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("VERSION:2.0");
    expect(text).toContain("BEGIN:VEVENT");
    expect(text).toContain("END:VCALENDAR");
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("converts the due date without letting the timezone shift the day", async () => {
    // A DATE column is built at local midnight; treating it as UTC moved it back
    // a day for anyone west of Greenwich.
    await downloadIcsForFollowUp(followUp({ dueAt: "2026-10-03" }));

    expect(await icsText()).toContain("DTSTART:20261003T090000Z");
  });

  it("names the file after the follow-up", async () => {
    const names = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function record() {
      names.push(this.getAttribute("download"));
    };

    downloadIcsForFollowUp(followUp());

    HTMLAnchorElement.prototype.click = original;
    expect(names).toEqual(["follow-up-f001.ics"]);
  });

  it("escapes the characters iCalendar reserves", async () => {
    await downloadIcsForFollowUp(
      followUp({ title: "Quote, revised; final", details: "Line one\nLine two\\end" }),
    );
    const text = await icsText();

    expect(text).toContain("Quote\\, revised\\; final");
    expect(text).toContain("Line one\\nLine two\\\\end");
  });

  it("folds a long line to 75 octets, repeatedly", async () => {
    await downloadIcsForFollowUp(followUp({ details: "x".repeat(200) }));
    const text = await icsText();

    // Every physical line respects the limit, continuation lines included. A
    // single split used to leave a 138-character continuation here.
    for (const line of text.split("\r\n")) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
    expect(text).toMatch(/\r\n /);
  });

  it("preserves the whole value across a fold", async () => {
    const details = "y".repeat(200);
    await downloadIcsForFollowUp(followUp({ details }));
    const text = unfold(await icsText());

    expect(text).toContain(details);
  });

  it("records the contact in the description and as the organiser", async () => {
    // The second argument is an options object, not the contact itself.
    await downloadIcsForFollowUp(followUp(), {
      contact: { name: "Nadine C", email: "nadine@example.com" },
    });
    const text = unfold(await icsText());

    expect(text).toContain("Contact: Nadine C <nadine@example.com>");
    expect(text).toContain("ORGANIZER");
    expect(text).toContain("mailto:");
  });

  it("omits the organiser when there is no contact to email", async () => {
    await downloadIcsForFollowUp(followUp());
    const text = await icsText();

    expect(text).not.toContain("ORGANIZER");
  });

  it("labels the event with the follow-up type", async () => {
    await downloadIcsForFollowUp(followUp({ type: "call" }));

    expect(await icsText()).toContain("SUMMARY:[Call] Send revised quote");
  });

  it("notes completion in the description", async () => {
    await downloadIcsForFollowUp(followUp({ status: "done" }));

    expect(await icsText()).toContain("Status: done");
  });

  it("returns null and writes nothing for an unusable due date", () => {
    expect(downloadIcsForFollowUp(followUp({ dueAt: null }))).toBeNull();
    expect(downloadIcsForFollowUp(followUp({ dueAt: "not-a-date" }))).toBeNull();
    expect(generatedFiles).toHaveLength(0);
  });
});
