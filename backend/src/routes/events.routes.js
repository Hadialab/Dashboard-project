import express from "express";

import { subscribeToChanges } from "../services/changeFeed.js";
import { issueStreamTicket, redeemStreamTicket } from "../auth/streamTicket.js";
import { requireAuth } from "../auth/requireAuth.js";
import { asyncHandler, unauthorized } from "../utils/asyncHandler.js";

const router = express.Router();

// Live updates, over Server-Sent Events.
//
// SSE rather than WebSockets, and the reason is that this application only ever
// needs server-to-client messages: changes are broadcast, a client never sends
// anything over the stream. SSE gives that over plain HTTP — no upgrade
// handshake, no extra dependency, no custom framing — and it reconnects on its
// own with the browser retrying and replaying the last event id.
//
// The alternative's costs are real and worth naming: a WebSocket connection has to
// be upgraded through every proxy in front of the app, which is where they
// silently fail; it needs its own library for framing and heartbeats; and it does
// not reconnect by itself. None of that buys anything here.
//
// What SSE is honest about: one-way only. A client that wants to *cause* a change
// uses the API, which is what everything already does.

// How often to send a comment line.
//
// SSE keeps a connection alive with comment frames, and every proxy in between
// has its own idle timeout — 60s for some load balancers, 100s for others. Too
// long and the stream is severed by something that looks like a network failure;
// too short and the connection is mostly comment frames. 25 seconds is under the
// common thresholds with room to spare.
const HEARTBEAT_MS = 25_000;

// Cap on concurrent streams per process.
//
// Each one is an open response Express is holding, and an unbounded number is a
// way for one client — or a loop with a bug — to exhaust the process's memory.
// Well above what a single company needs, low enough to notice.
const MAX_STREAMS = 500;

let openStreams = 0;

/**
 * Mints a ticket for opening a stream.
 *
 * Separate from the stream itself because `EventSource` cannot send an
 * `Authorization` header, and the session token must never go in a query string
 * where it would be logged. See auth/streamTicket.js.
 */
router.post(
  "/ticket",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ ticket: issueStreamTicket(req.user), expiresIn: 30 });
  }),
);

/**
 * The stream itself.
 *
 * Authenticated by ticket rather than by header, and scoped to one organization:
 * a subscriber only ever receives events for their own company. That filter is
 * the whole security property of this endpoint — without it, opening a stream
 * would be a way to watch another tenant's activity.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const ticket = redeemStreamTicket(req.query.ticket);
    if (!ticket) throw unauthorized("Invalid or expired stream ticket");

    if (openStreams >= MAX_STREAMS) {
      // 503 with a retry hint rather than a 429: the client should try again, and
      // the cause is capacity rather than anything it did wrong.
      res.set("Retry-After", "30");
      res.status(503).json({ error: "Too many live-update streams open" });
      return;
    }

    openStreams += 1;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      // Without this nginx buffers the response and nothing is delivered until the
      // connection ends — the stream appears to work and delivers nothing.
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    });

    // Tells the client how long to wait before reconnecting, and is the field a
    // reverse proxy is most likely to honour.
    res.write("retry: 5000\n\n");

    // An immediate comment, so the client's `onopen` fires immediately rather than
    // after the first heartbeat — up to 25 seconds of "connecting" that is not a
    // connection problem at all.
    res.write(": connected\n\n");

    // Identifies the session, so a client that reconnects can tell a fresh stream
    // from the one it lost and knows it may have missed events.
    res.write(
      `event: ready\ndata: ${JSON.stringify({ organizationId: ticket.organizationId })}\n\n`,
    );

    const unsubscribe = subscribeToChanges(ticket.organizationId, (event) => {
      // `id` is what makes a reconnect replayable: the browser sends the last id it
      // saw in `Last-Event-ID`, which a future implementation could use to
      // backfill. Setting it now costs nothing and makes that possible.
      res.write(
        `id: ${event.eventId}\ndata: ${JSON.stringify(event)}\n\n`,
      );
    });

    const heartbeat = setInterval(() => {
      // A comment frame: ignored by the client, but it proves the connection is
      // alive to both ends and keeps intermediaries from timing it out.
      res.write(": ping\n\n");
    }, HEARTBEAT_MS);

    const close = () => {
      clearInterval(heartbeat);
      unsubscribe();
      openStreams -= 1;
    };

    // Both are needed. `close` fires when the client goes away normally; `error`
    // fires when the socket breaks, and without it a broken stream would hold its
    // slot in openStreams until the process restarts.
    res.on("close", close);
    res.on("error", close);
  }),
);

export default router;