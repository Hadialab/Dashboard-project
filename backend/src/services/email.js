// Email sending.
//
// There is no hard dependency on a provider: with no API key configured the
// sender reports that it is disabled and callers fall back to a client-side
// mailto: link. Add RESEND_API_KEY to switch real delivery on.
//
// Why the indirection: choosing a provider is a deployment decision. Keeping
// the interface small means swapping Resend for SES or Postmark is a new adapter,
// not a rewrite of the calling code.
//
// Every attempt is recorded in `sent_email`, on success and on failure alike. A
// send that silently fails is the failure mode that gets discovered weeks later,
// by a customer asking why they were never reminded.

import { logEmailAttempt } from "../db/repos/email.js";

export const FOLLOWUP_TYPES = ["call", "email", "meeting", "task"];

export const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? "resend";
export const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";
export const EMAIL_FROM = process.env.EMAIL_FROM ?? "";

// How long a password reset link stays usable. Short, because the link is a
// bearer token delivered over email: it grants a full account reset to anyone who
// reads the message, and the whole point of confirming the address is that the
// owner is the one who reads it. Fifteen minutes is long enough to find an email
// and click a link, and short enough that a link found months later in a backup or
// a shared mailbox is worthless.
export const RESET_TOKEN_TTL_MINUTES = 15;

export function isEmailConfigured() {
  return Boolean(EMAIL_API_KEY && EMAIL_FROM);
}

async function sendViaResend({ to, subject, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      text,
      // Both parts, not just html. A text alternative is not a nicety: it is what
      // screen readers, `mutt`, and every corporate mail gateway read, and an HTML
      // message with no text part is either rejected or rendered as a blank page.
      ...(html ? { html } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the message (${response.status}): ${detail}`);
  }

  return { id: (await response.json())?.id ?? null, provider: "resend" };
}

/**
 * Sends an email.
 *
 * Returns `{ sent: false, reason }` rather than throwing when no provider is
 * configured or delivery fails, so a missing API key degrades to "not sent"
 * instead of breaking the request that triggered it — a follow-up must still be
 * markable done when its notification could not go out.
 *
 * `template`, `userId` and `organizationId` are for the record only; they never
 * affect delivery.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  template = "custom",
  userId = null,
  organizationId = null,
}) {
  const record = (status, detail) =>
    logEmailAttempt({ organizationId, userId, template, recipient: to, subject, status, detail });

  if (!to) {
    await record("skipped", "No recipient address");
    return { sent: false, reason: "No recipient address" };
  }

  if (!isEmailConfigured()) {
    // Recorded as `skipped` rather than `failed`: nothing went wrong, delivery was
    // never attempted. Collapsing the two would make an unconfigured environment
    // look like an outage.
    await record(
      "skipped",
      "No provider configured (EMAIL_API_KEY and EMAIL_FROM are unset)",
    );

    return {
      sent: false,
      reason:
        "Server email is not configured. Set EMAIL_API_KEY and EMAIL_FROM to enable it, " +
        "or use the mail link to open the user's own mail client.",
    };
  }

  try {
    const result =
      EMAIL_PROVIDER === "resend"
        ? await sendViaResend({ to, subject, text, html })
        : null;

    if (!result) {
      await record("failed", `Unknown EMAIL_PROVIDER "${EMAIL_PROVIDER}". Supported: resend.`);

      return {
        sent: false,
        reason: `Unknown EMAIL_PROVIDER "${EMAIL_PROVIDER}". Supported: resend.`,
      };
    }

    await record("sent", result.id);
    return { sent: true, ...result };
  } catch (error) {
    await record("failed", error.message);

    // Reported, not thrown, for the reason above: the caller's own work succeeded
    // and should not be reported as a failure.
    return { sent: false, reason: error.message };
  }
}