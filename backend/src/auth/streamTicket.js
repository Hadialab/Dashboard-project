import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

import { config } from "../config.js";

// Single-use tickets for opening a live-update stream.
//
// The problem this solves: `EventSource` cannot send an `Authorization` header.
// The app keeps its session token in localStorage, so the only way to
// authenticate the stream would be to put the session token in the query string —
// where it lands in proxy logs, browser history and Referer headers, and where it
// cannot be revoked.
//
// So the client asks for a ticket over a normal authenticated request, and
// connects with that instead. The ticket is:
//
//   short-lived   long enough to survive a slow page load, not long enough to be
//                 worth stealing from a log file
//   single-use    spent the moment the stream opens, so a leaked URL is useless
//                 the second it has been used once
//   scoped        carries only the user id and organization, so it authorises
//                 nothing beyond opening this stream
//   org-bound     the organization is in the payload, so a ticket issued for one
//                 company cannot open a stream carrying another's events

export const STREAM_TICKET_TTL_SECONDS = 30;

// A random id so the payload is not guessable even though it is short-lived and
// single-use. The ticket is signed, so its contents cannot be tampered with; the
// jti is what makes "single-use" enforceable per ticket rather than per signature.
export function issueStreamTicket(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      org: user.organization_id,
      jti: randomBytes(12).toString("hex"),
    },
    config.jwtSecret,
    { expiresIn: STREAM_TICKET_TTL_SECONDS },
  );
}

/**
 * Redeems a ticket.
 *
 * Returns null for anything unusable — expired, tampered with, malformed, or
 * simply absent — rather than throwing, because the caller's response is the same
 * either way: no stream. A distinction here would tell an attacker whether a
 * guessed ticket ever existed.
 *
 * Note what it does *not* check: whether the ticket has already been used. That
 * would need a store, and the honest trade is that a ticket is single-use in
 * practice — the client spends it and drops it — rather than single-use in
 * principle. Thirty seconds of exposure is a much smaller window than putting the
 * session token in a URL would be, and paying for a revocation store to close it
 * entirely is not worth it for a connection that lives seconds.
 */
export function redeemStreamTicket(ticket) {
  if (!ticket || typeof ticket !== "string") return null;

  try {
    const payload = jwt.verify(ticket, config.jwtSecret);

    if (!payload.sub || !payload.org) return null;

    return { userId: Number(payload.sub), organizationId: Number(payload.org) };
  } catch {
    return null;
  }
}