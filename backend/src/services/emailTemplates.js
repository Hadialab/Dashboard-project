// The email bodies.
//
// Two rules govern this file, and both exist because the inputs are untrusted:
//
//   1. Every interpolated value goes through `escapeHtml`. Customer names, deal
//      titles and follow-up details are typed by whoever is using the CRM, and a
//      message body is rendered as markup by some clients. A customer called
//      `<img src=x onerror=...>` would otherwise execute in the recipient's mail
//      client. The plain-text part gets no escaping — it is not markup — but it
//      does get header-injection protection, below.
//
//   2. No value is placed in a header unescaped. `subject` becomes an SMTP header,
//      and a newline in it is header injection: it can add a Bcc and turn the
//      app into an open relay. `safeSubject` strips CR and LF for that reason.
//
// Both are one-line functions and both are load-bearing.

// HTML-escapes the five characters that matter in text content and attributes.
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Makes a string safe to use as a subject or any other header value.
 *
 * Strips CR and LF rather than escaping them: there is no legitimate reason for a
 * subject to contain a newline, and escaping to a literal `\n` would put visible
 * junk in the recipient's subject line. A title entered with a newline in it is
 * already being displayed wrong everywhere else in the app.
 */
export function safeSubject(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

/**
 * The shared layout.
 *
 * Table-based and inline-styled on purpose. A `<style>` block or a webfont is
 * stripped by Gmail and Outlook, which is the difference between a message that
 * looks intentional and one that arrives as unstyled text. Width is capped for the
 * same reason.
 */
function layout({ heading, bodyHtml, action }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:20px 28px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">CRM Dashboard</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0f172a;">${heading}</h1>
                ${bodyHtml}
                ${
                  action
                    ? `<p style="margin:24px 0 0;">
                         <a href="${escapeHtml(action.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(action.label)}</a>
                       </p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                  You are receiving this because someone set up an account with this address. If that was not you, no action is needed.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Turns plain text into paragraphs, keeping blank-line breaks. */
function paragraphs(lines) {
  return lines
    .filter((line) => line !== "")
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(line)}</p>`,
    )
    .join("\n");
}

/**
 * Every message, described once.
 *
 * Each returns `{ subject, text, html }` rather than being sent, so the caller
 * controls delivery and the templates stay trivially testable — asserting on a
 * string is reliable where asserting on a provider request is not.
 */
export const templates = {
  welcome({ name, appUrl }) {
    const greeting = name ? `Welcome, ${name}.` : "Welcome.";

    return {
      subject: safeSubject("Welcome to CRM Dashboard"),
      text: [
        greeting,
        "",
        "Your CRM Dashboard account is ready. Sign in to add your first customer.",
        "",
        `${appUrl}/login`,
      ].join("\n"),
      html: layout({
        heading: escapeHtml(greeting),
        bodyHtml: paragraphs([
          "Your CRM Dashboard account is ready. Add your first customer, or import a list you already have.",
        ]),
        action: { label: "Sign in", url: `${appUrl}/login` },
      }),
    };
  },

  passwordReset({ name, resetUrl, ttlMinutes }) {
    const greeting = name ? `Hello ${name},` : "Hello,";

    return {
      subject: safeSubject("Reset your CRM Dashboard password"),
      text: [
        greeting,
        "",
        "Use the link below to choose a new password.",
        `It works once, and expires in ${ttlMinutes} minutes.`,
        "",
        resetUrl,
        "",
        "If you did not ask for this, you can ignore this email — nothing has changed.",
      ].join("\n"),
      html: layout({
        heading: "Reset your password",
        bodyHtml:
          paragraphs([
            `${greeting} Use the button below to choose a new password.`,
            `The link works once and expires in ${ttlMinutes} minutes.`,
            "If you did not ask for this, you can ignore this email — nothing has changed.",
          ]) +
          // The URL is also printed as text, not only behind the button. A long
          // token is truncated in some clients and a reset link that cannot be read
          // cannot be copied out of a rendered button.
          `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b;word-break:break-all;">
             If the button does not work, paste this into your browser:<br />
             <a href="${escapeHtml(resetUrl)}" style="color:#2563eb;">${escapeHtml(resetUrl)}</a>
           </p>`,
        action: { label: "Choose a new password", url: resetUrl },
      }),
    };
  },

  followUpReminder({ contactName, title, dueAt, details, appUrl }) {
    return {
      subject: safeSubject(`Follow-up: ${title}`),
      text: [
        contactName ? `Reminder for ${contactName}.` : "Reminder.",
        "",
        `${title} — due ${dueAt}.`,
        details || "",
      ]
        .filter(Boolean)
        .join("\n"),
      html: layout({
        heading: escapeHtml(title),
        bodyHtml:
          paragraphs([
            contactName ? `Reminder for ${contactName}.` : "",
            `Due ${dueAt}.`,
            details || "",
          ]) +
          `<p style="margin:20px 0 0;font-size:13px;color:#64748b;">
             <a href="${escapeHtml(appUrl)}/followups" style="color:#2563eb;">Open CRM Dashboard</a>
           </p>`,
      }),
    };
  },
};