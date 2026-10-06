import { describe, it, expect } from "vitest";

import { escapeHtml, safeSubject, templates } from "../services/emailTemplates.js";

// Every value in an email body is typed by whoever is using the CRM, and the body
// is rendered as markup by some clients. These tests are the boundary: what
// happens when a customer is called something that looks like HTML.

describe("escapeHtml", () => {
  it("escapes the five characters that matter", () => {
    expect(escapeHtml(`<img src=x onerror="alert('1')">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;",
    );
  });

  it("escapes ampersands first, so escapes are not double-processed", () => {
    // The order matters. Escaping `&` last would turn the `&lt;` this function
    // just produced into `&amp;lt;`, and the recipient would see the literal text
    // "&lt;" instead of a "<".
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("renders null and undefined as an empty string", () => {
    // Not "null". An absent value in an email should leave no trace, and the
    // string "null" in a message reads as a bug.
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeHtml("Acme Ltd")).toBe("Acme Ltd");
    expect(escapeHtml("R&D")).toBe("R&amp;D");
  });
});

describe("safeSubject", () => {
  it("strips the newlines that would split an SMTP header", () => {
    // A subject becomes a header. A newline in it can add a Bcc, which turns the
    // app into an open relay — so CR and LF are removed rather than escaped.
    expect(safeSubject("Deal\r\nBcc: attacker@evil.test")).toBe("Deal Bcc: attacker@evil.test");
    expect(safeSubject("Deal\n\nX-Injected: yes")).toBe("Deal X-Injected: yes");
  });

  it("does not invent visible junk", () => {
    // Escaping to a literal `\n` would put backslash-n in the subject line the
    // recipient sees. There is no legitimate reason for a subject to contain a
    // newline, so it is dropped.
    expect(safeSubject("Q3 review")).toBe("Q3 review");
    expect(safeSubject("  padded  ")).toBe("padded");
  });

  it("handles a missing value", () => {
    expect(safeSubject(undefined)).toBe("");
    expect(safeSubject(null)).toBe("");
  });
});

describe("templates", () => {
  it("returns both a subject and both bodies", () => {
    // The text part is not a fallback: it is what screen readers, mutt and
    // corporate mail gateways read, and a message with only HTML is either
    // rejected or rendered blank.
    const welcome = templates.welcome({ name: "Nadia", appUrl: "https://crm.example.com" });

    expect(welcome.subject).toBe("Welcome to CRM Dashboard");
    expect(welcome.text).toContain("https://crm.example.com/login");
    expect(welcome.html).toContain("<html");
    expect(welcome.html).toContain("Nadia");
  });

  it("escapes an untrusted name in both parts of the welcome", () => {
    const hostile = "Nadia <script>alert(1)</script>";
    const welcome = templates.welcome({ name: hostile, appUrl: "https://crm.example.com" });

    // Escaped in the HTML, and left as-is in the text part — which is not markup,
    // so escaping it there would show the user literal `&lt;`.
    expect(welcome.html).not.toContain("<script>");
    expect(welcome.html).toContain("&lt;script&gt;");
    expect(welcome.text).toContain("<script>");
  });

  it("puts the reset URL in the text body as well as behind the button", () => {
    // A 64-character token is truncated in some clients, and a link that cannot be
    // read cannot be copied out of a rendered button.
    const resetUrl = "https://crm.example.com/reset-password?token=" + "a".repeat(64);
    const reset = templates.passwordReset({
      name: "Nadia",
      resetUrl,
      ttlMinutes: 15,
    });

    expect(reset.text).toContain(resetUrl);
    expect(reset.html).toContain(resetUrl);
    expect(reset.text).toContain("15 minutes");
  });

  it("never leaks a password into a reset message", () => {
    // The password is not known when the email is composed, but asserting the
    // shape keeps a future edit from adding it by accident.
    const reset = templates.passwordReset({
      name: "Nadia",
      resetUrl: "https://crm.example.com/reset-password?token=x",
      ttlMinutes: 15,
    });

    expect(reset.text).not.toMatch(/password[:=]\s*\S/i);
    expect(reset.html.toLowerCase()).not.toContain("your new password is");
  });

  it("sanitises a follow-up title into the subject", () => {
    const reminder = templates.followUpReminder({
      contactName: "Acme",
      title: "Call back\r\nBcc: attacker@evil.test",
      dueAt: "2026-10-06",
      details: "",
      appUrl: "https://crm.example.com",
    });

    expect(reminder.subject).toBe("Follow-up: Call back Bcc: attacker@evil.test");
    expect(reminder.subject).not.toContain("\r");
    expect(reminder.subject).not.toContain("\n");
  });

  it("escapes untrusted follow-up content in the html part", () => {
    const reminder = templates.followUpReminder({
      contactName: "<b>Acme</b>",
      title: "Deal <img src=x onerror=alert(1)>",
      dueAt: "2026-10-06",
      details: "Discuss <script>alert(2)</script>",
      appUrl: "https://crm.example.com",
    });

    // Asserted on the tag characters, not on substrings like "onerror=". Once
    // `<` is escaped the rest of the payload is inert text, so `onerror=alert`
    // legitimately survives as visible characters — the property that matters is
    // that nothing here can open a tag.
    expect(reminder.html).not.toContain("<script");
    expect(reminder.html).not.toContain("<img");
    expect(reminder.html).not.toContain("<b>");

    expect(reminder.html).toContain("&lt;script&gt;");
    expect(reminder.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("omits an empty details line rather than leaving a blank paragraph", () => {
    const withDetails = templates.followUpReminder({
      contactName: "Acme", title: "Call", dueAt: "2026-10-06",
      details: "About the renewal", appUrl: "https://crm.example.com",
    });
    const without = templates.followUpReminder({
      contactName: "Acme", title: "Call", dueAt: "2026-10-06",
      details: "", appUrl: "https://crm.example.com",
    });

    expect(withDetails.text).toContain("About the renewal");
    expect(without.text).not.toContain("\n\n\n");
  });

  it("does not break when the contact name is missing", () => {
    // Deals store a customer by name and can have none.
    const reminder = templates.followUpReminder({
      contactName: "",
      title: "Follow up",
      dueAt: "2026-10-06",
      details: "",
      appUrl: "https://crm.example.com",
    });

    expect(reminder.text).toContain("Reminder.");
    expect(reminder.text).toContain("Follow up");
  });
});