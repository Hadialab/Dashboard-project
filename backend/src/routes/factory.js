import express from "express";
import { repo } from "../db/repos/crm.js";
import { notesRepo } from "../db/repos/activity.js";
import { insertAuditEntry } from "../db/repos/audit.js";
import { findUserById } from "../db/repos/users.js";
import { runQuery } from "../utils/query.js";
import { asyncHandler, badRequest, conflict, forbidden, notFound } from "../utils/asyncHandler.js";
import { validate, TIMELINE, resources } from "../validation/resources.js";
import { describeChange } from "../validation/noteSchema.js";
import { describeCreation, describeDeletion, diffRecord, hasChanges } from "../audit/diff.js";
import { can, canViewRow, isAdmin } from "../auth/permissions.js";

// Builds CRUD routes for one collection. Two independent gates apply to every
// request: the tenant (which company's data this is) and the caller's
// permissions for this resource, which admins bypass.
export function createResourceRouter(name, config) {
  const router = express.Router();
  const permissionName = config.permissionName;
  const records = repo(name);

  // Filters the collection down to what this user is allowed to see. The rows
  // arrive already restricted to their own organization.
  const visibleRows = (rows, user) =>
    can(user, permissionName, "view")
      ? rows.filter((row) => canViewRow(user, permissionName, row))
      : [];

  // Resolves a record for reading, or throws 404. A record the user cannot see
  // is reported as missing rather than forbidden, so the API does not confirm
  // the existence of records someone has no access to.
  const findVisible = async (id, req) => {
    if (!can(req.user, permissionName, "view")) {
      throw forbidden("You do not have access to this section");
    }

    const row = await records.findById(req.organizationId, id);
    if (!row || !canViewRow(req.user, permissionName, row)) {
      throw notFound(`${singular(name)} not found`);
    }

    return row;
  };

  // Resolves a record for writing. 403 rather than 404, because the user could
  // already see the record — they were sent to it by a list they can read.
  const findEditable = async (id, req, action) => {
    const row = await findVisible(id, req);

    if (!can(req.user, permissionName, action)) {
      throw forbidden(`You do not have permission to ${action} this ${singular(name)}`);
    }

    return row;
  };

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      // Refuse the whole section rather than answering with an empty list. An
      // empty 200 is indistinguishable from "no records yet", which hides a
      // misconfigured permission behind what looks like a normal empty state.
      if (!can(req.user, permissionName, "view")) {
        throw forbidden("You do not have access to this section");
      }

      const rows = await records.all(req.organizationId);
      res.json(runQuery(visibleRows(rows, req.user), req.query, config));
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      res.json(await findVisible(req.params.id, req));
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      if (!can(req.user, permissionName, "create")) {
        throw forbidden(`You do not have permission to create a ${singular(name)}`);
      }

      const { value, errors } = validate(config, req.body, { partial: false });
      if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

      // A sales user owns what they create, so it is inside their "own" scope.
      const ownership = await applyOwnership(config, null, req);

      const created = await records.insert(req.organizationId, {
        ...withDefaults(config, value),
        ...ownership,
      });

      // Every record opens with a line on its own timeline, so the activity
      // view is never an unexplained blank page.
      await recordEvent(req, config.entityType, created.id, `${singular(name)} created`);

      // And a row in the audit log, carrying every field as written. Written from
      // the row the database stored, so the log cannot claim values the insert
      // did not accept.
      await audit(
        req,
        "create",
        config.entityType,
        created.id,
        describeCreation(created, config.fields),
        created[config.labelField],
      );

      res.status(201).json(created);
    }),
  );

  // PUT is treated as a full replace, matching what the frontend sends (it
  // always submits the whole row). id and server-owned fields stay fixed.
  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const existing = await findEditable(req.params.id, req, "edit");

      const { value, errors } = validate(config, req.body, { partial: false });
      if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

      guardConverted(name, existing, value);

      const ownership = await applyOwnership(config, existing, req);

      const updated = await records.update(req.organizationId, existing.id, {
        ...withDefaults(config, value),
        ...ownership,
      });

      // Written after the update succeeds, from the row the database actually
      // stored — so the entry cannot claim a change that did not happen.
      await recordChanges(req, name, existing, updated);

      // The audit entry carries the full diff rather than the timeline's subset,
      // so an edit to an email address is as traceable as a stage move. Skipped
      // entirely when nothing changed: a PUT that submits the same form — which
      // the frontend does on every save — must not fill the log with noise.
      const diff = diffRecord(existing, updated);
      if (hasChanges(diff)) {
        // The label is read from the *updated* row, not the previous one: the log should
      // say what the record is called now, since that is what someone reading it
      // would search for.
      await audit(
        req,
        "update",
        config.entityType,
        updated.id,
        diff,
        updated[config.labelField],
      );
      }

      res.json(updated);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const row = await findEditable(req.params.id, req, "delete");
      const removed = await records.remove(req.organizationId, row.id);

      // After the delete, not before: an entry describing a removal that then
      // failed would be worse than no entry. The prior values are captured in the
      // entry itself, since the row no longer exists to read them from.
      await audit(
        req,
        "delete",
        config.entityType,
        row.id,
        describeDeletion(row, config.fields),
        row[config.labelField],
      );

      res.json(removed);
    }),
  );

  return router;
}

// Works out the owner fields for a write.
//
// The owner is always a real user in the caller's own organization — the
// display name is derived from that user rather than accepted from the client,
// so the two can never disagree and "own records only" cannot be bypassed by
// typing someone else's name.
//
// Nobody can hand a record to another company: the lookup is organization
// scoped, so an id from elsewhere is rejected as an unknown user.
//
// Rules:
//   - Creating, no ownerId given  -> you own it
//   - Creating, ownerId: null     -> left unassigned (admin only; visible to
//                                   admins alone, since there is no owner to
//                                   match a sales user against)
//   - Creating, ownerId: <id>    -> that user, admins only
//   - Editing                    -> unchanged unless an admin reassigns
async function applyOwnership(config, existing, req) {
  if (!config.owned) return {};

  const idField = config.ownerField;
  const labelField = config.ownerLabelField;
  const { user } = req;

  if (!isAdmin(user)) {
    // A sales user owns what they create and keeps the current owner on edit,
    // otherwise an "own records only" scope would be trivially bypassable.
    if (!existing) return { [idField]: user.id, [labelField]: user.name };

    return {
      [idField]: existing[idField] ?? user.id,
      [labelField]: existing[labelField] ?? user.name,
    };
  }

  const requested = req.body?.ownerId;

  // Absent means "same as before", and on create that resolves to the admin.
  const newOwnerId = requested === undefined ? (existing?.[idField] ?? user.id) : requested;

  const owner = newOwnerId ? await findUserById(req.organizationId, newOwnerId) : null;

  // Guard against pointing a record at a user that does not exist, including
  // one belonging to a different company.
  if (newOwnerId && !owner) {
    throw badRequest("Validation failed", { ownerId: "Unknown user" });
  }

  return { [idField]: owner?.id ?? null, [labelField]: owner?.name ?? "Unassigned" };
}

function withDefaults(config, value) {
  const row = { ...value };

  // Only deals and leads carry a createdDate, and clients never set it. The
  // column itself defaults to now(), so this only covers the case where the
  // frontend sends a full row on update and omits it.
  if (config.fields.includes("createdDate") && !row.createdDate) {
    row.createdDate = new Date().toISOString().slice(0, 10);
  }

  return row;
}

const CONVERTED_STATUS = "Converted";

/**
 * A lead that has already become a customer cannot go back to being an open lead.
 *
 * converted_customer_id is the record of that conversion and nothing clears it —
 * conversion is one-way by design. So a plain status edit that moved a converted
 * lead back to "New" or "Contacted" would leave the row claiming to be open while
 * the link to its customer stayed put, and the row would then offer "Convert to
 * customer" for a conversion the server answers with 409. Rejecting the edit keeps
 * the two facts in agreement instead of leaving the record lying about itself.
 */
function guardConverted(name, existing, value) {
  if (name !== "leads") return;
  if (!existing.convertedCustomerId) return;

  const nextStatus = value.status;
  if (nextStatus === undefined || nextStatus === CONVERTED_STATUS) return;

  throw conflict(
    `This lead has already been converted to customer ${existing.convertedCustomerId}, so its status cannot be changed to "${nextStatus}".`,
    { customerId: existing.convertedCustomerId },
  );
}

// ===== Audit log =====
//
// Every write above funnels through here, so the audit log cannot be bypassed by
// a new caller. That is the same argument the activity timeline makes, and the
// reason both live in this file rather than in the pages: the pipeline board, a
// form and a CSV import all reach the same place, so all three leave the same
// trace.
//
// Written after the business write commits, so an entry can never describe a
// change that rolled back. The actor is taken from the authenticated session, not
// from the body — a client cannot write an audit entry in someone else's name.

async function audit(req, action, entityType, entityId, changes, label) {
  await insertAuditEntry(req.organizationId, {
    actorId: req.user.id,
    actorName: req.user.name,
    action,
    entityType,
    entityId,
    // Denormalised onto the row so the log is readable without looking the record
    // up — which matters most for a delete, where there is nothing left to look
    // up.
    //
    // A string rather than a record, and passed in by the caller, because this
    // helper is defined outside createResourceRouter and has no `config` to read
    // `labelField` from. The caller inside the router passes
    // `record[config.labelField]`, which is where a deal's `title` becomes a
    // label rather than an undefined `name`.
    entityLabel: label,
    changes,
  });
}

/**
 * Records a permission change.
 *
 * Separate from `audit` because it runs on a different router, and because the
 * "entity" being changed is a user rather than a CRM record. Exported so
 * auth.routes.js writes it through the same repo and the same rules.
 */
export async function auditPermissionChange(req, targetUserId, changes, targetName) {
  if (!hasChanges(changes)) return;

  await insertAuditEntry(req.organizationId, {
    actorId: req.user.id,
    actorName: req.user.name,
    action: "permission_change",
    entityType: "user",
    entityId: targetUserId,
    entityLabel: targetName,
    changes,
  });
}

// ===== Activity timeline =====
//
// The server writes these rather than the pages. Every write passes through
// here, so a stage dragged on the pipeline board, a status changed in a form and
// a row imported from a CSV all leave the same trace — and because the entry is
// written after the update commits, it can never describe a change that rolled
// back.

async function recordEvent(req, entityType, entityId, body) {
  try {
    await notesRepo.insert(req.organizationId, {
      entityType,
      entityId,
      body,
      kind: "event",
      authorId: req.user.id,
      authorName: req.user.name,
    });
  } catch (error) {
    // The record itself is already saved. Failing the whole request here would
    // report a write that did succeed as an error, so log and move on.
    console.error("[timeline] could not record event:", error.message);
  }
}

async function recordChanges(req, name, before, after) {
  const fields = TIMELINE[name] ?? [];
  const entries = [];

  for (const field of fields) {
    // compared as strings: NUMERIC comes back as a number and a form sends one
    // as a string, and "12000" === 12000 being false would log a change on
    // every save of an unchanged form.
    const from = String(before[field] ?? "");
    const to = String(after[field] ?? "");

    const sentence = describeChange(field, before[field], after[field]);
    if (sentence && from !== to) entries.push(sentence);
  }

  for (const body of entries) {
    await recordEvent(req, resources[name].entityType, after.id, body);
  }
}

function singular(name) {
  return name.endsWith("s") ? name.slice(0, -1) : name;
}
