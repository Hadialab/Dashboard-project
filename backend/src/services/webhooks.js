import { signWebhook, recordWebhookDelivery } from "../db/repos/apiKeys.js";
import { liveWebhooks } from "../db/repos/apiKeys.js";

// Outbound webhook delivery.
//
// Fire-and-forget, and that is the whole design rather than an omission. A webhook
// is a courtesy to a system this app does not control: if Slack is down, the deal
// has still been saved and the user has still been told so. Blocking a CRM write on
// a third party's uptime would be the wrong trade, so a failed delivery is recorded
// against the subscription and otherwise ignored.
//
// The consequences are stated rather than hidden: at-least-once, never retried, and
// a slow receiver is given a deadline rather than being waited on indefinitely.

const DELIVERY_TIMEOUT_MS = 5000;

// How many recent attempts to keep per subscription. Ten is enough to see a
// pattern; beyond that the list stops being readable next to the subscription.
const MAX_RECORDED = 10;

/**
 * Sends one event to one subscription.
 *
 * Returns the attempt, whatever it was — the caller records it either way, because
 * "it failed" is the more useful thing to have written down.
 */
async function deliver(webhook, event) {
  const body = JSON.stringify({
    event: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    occurredAt: new Date().toISOString(),
    // Enough for the receiver to fetch the record. Deliberately not the record
    // itself: a webhook payload containing customer names and phone numbers would
    // copy this tenant's data to every endpoint it is pointed at.
    actorName: event.actorName ?? null,
    organizationId: event.organizationId,
  });

  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const response = await fetch(webhook.targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Headers a receiver needs in order to verify anything at all.
        "X-CRM-Event": event.action,
        "X-CRM-Timestamp": String(timestamp),
        "X-CRM-Signature": `sha256=${signWebhook(webhook.signingSecret, body, timestamp)}`,
        "X-CRM-Delivery": `${webhook.id}-${timestamp}`,
      },
      body,
      // A receiver that hangs must not hold the request that triggered it open.
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });

    return {
      at: new Date().toISOString(),
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      at: new Date().toISOString(),
      ok: false,
      // AbortSignal.timeout surfaces as a TimeoutError; the message is more useful
      // in the record than the class is.
      error: error.name === "TimeoutError" ? `timed out after ${DELIVERY_TIMEOUT_MS}ms` : error.message,
    };
  }
}

/**
 * Dispatches an event to every subscription that asked for it.
 *
 * Called from the same place that writes the audit entry, so a change is audited
 * and broadcast once, together. Never awaited by the caller: the response to the
 * user's request does not wait on anyone else's webhook receiver.
 */
export function dispatchWebhooks(event) {
  void (async () => {
    let subscriptions;

    try {
      subscriptions = await liveWebhooks(event.organizationId);
    } catch (error) {
      console.error("[webhooks] could not load subscriptions:", error.message);
      return;
    }

    // An empty `events` array means "everything". Stated in the UI, because a
    // subscription that silently stops matching is the classic webhook bug.
    const interested = subscriptions.filter(
      (hook) => hook.events.length === 0 || hook.events.includes(event.action),
    );

    // Parallel, not sequential: one slow receiver must not delay the others.
    await Promise.all(
      interested.map(async (hook) => {
        const attempt = await deliver(hook, event);

        try {
          await recordWebhookDelivery(hook.id, attempt);
        } catch (error) {
          console.error("[webhooks] could not record a delivery:", error.message);
        }

        if (!attempt.ok) {
          console.error(
            `[webhooks] ${hook.id} -> ${hook.targetUrl} failed:`,
            attempt.error ?? attempt.status,
          );
        }
      }),
    );
  })();
}

export { MAX_RECORDED };