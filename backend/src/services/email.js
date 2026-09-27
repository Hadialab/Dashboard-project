// Email sending.
//
// There is no hard dependency on a provider: with no API key configured the
// sender reports that it is disabled and callers fall back to a client-side
// mailto: link. Add RESEND_API_KEY to switch real delivery on.
//
// Why the indirection: choosing a provider is a deployment decision. Keeping
// the interface small means swapping Resend for SES or Postmark is a new
// adapter, not a rewrite of the calling code.

export const FOLLOWUP_TYPES = ["call", "email", "meeting", "task"];

export const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? "resend";
export const EMAIL_API_KEY = process.env.EMAIL_API_KEY ?? "";
export const EMAIL_FROM = process.env.EMAIL_FROM ?? "";

export function isEmailConfigured() {
  return Boolean(EMAIL_API_KEY && EMAIL_FROM);
}

async function sendViaResend({ to, subject, text }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the message (${response.status}): ${detail}`);
  }

  return { id: (await response.json())?.id ?? null, provider: "resend" };
}

/**
 * Sends an email. Returns { sent: false, reason } rather than throwing when
 * no provider is configured, so a missing API key degrades to "not sent"
 * instead of breaking the request.
 */
export async function sendEmail({ to, subject, text }) {
  if (!to) return { sent: false, reason: "No recipient address" };

  if (!isEmailConfigured()) {
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
        ? await sendViaResend({ to, subject, text })
        : null;

    if (!result) {
      return {
        sent: false,
        reason: `Unknown EMAIL_PROVIDER "${EMAIL_PROVIDER}". Supported: resend.`,
      };
    }

    return { sent: true, ...result };
  } catch (error) {
    // Delivery failure is reported, not thrown, so a follow-up can still be
    // marked done even if the notification could not go out.
    return { sent: false, reason: error.message };
  }
}
