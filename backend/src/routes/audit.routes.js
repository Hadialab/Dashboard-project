import express from "express";

import { countAuditEntries, listAuditActors, listAuditEntries } from "../db/repos/audit.js";
import { requireAuth } from "../auth/requireAuth.js";
import { requireRole } from "../auth/roles.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// Admin-only, and unconditionally so.
//
// This is not routed through the permission table, because the permission table
// governs CRM data and this is metadata *about* that data: who accessed it. A
// company admin who can read the log is the same person who can already change
// every permission in the company, so the ability to see who else did so adds no
// capability — but a sales user reading it would learn what their colleagues and
// managers are doing, which is a different thing entirely.
//
// It is also the only router with no route for editing or deleting an entry. The
// log is append-only by design; see db/repos/audit.js.

/**
 * The log, filtered and paginated.
 *
 * Query parameters, all optional:
 *   actorId     number   only this user (by id)
 *   actorName   string   only this user (by name — survives a deleted account,
 *                       which is why both are offered)
 *   entityType  string   customer | lead | deal | user
 *   entityId    string   substring match, for finding one record's history
 *   action      string   create | update | delete | convert | permission_change
 *   from, to    date     inclusive range on the calendar day
 *   limit       number   capped server-side at 500
 *   offset      number
 */
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const filters = {
      // actorName is matched in the repo when present and no id was given. Both
      // filters are supported rather than one, because after an account is
      // deleted the id is gone and only the name still identifies them.
      ...req.query,
      ...(req.query.actorName && !req.query.actorId
        ? { actorName: String(req.query.actorName) }
        : {}),
    };

    const [page, total] = await Promise.all([
      listAuditEntries(req.organizationId, filters),
      countAuditEntries(req.organizationId, filters),
    ]);

    res.json({
      entries: page.rows,
      total,
      limit: page.limit,
      offset: page.offset,
      // Returned so the view can offer exactly the actors who have entries,
      // rather than a hardcoded list of team members — a removed account has
      // entries and must still be filterable.
      actors: await listAuditActors(req.organizationId),
    });
  }),
);

export default router;