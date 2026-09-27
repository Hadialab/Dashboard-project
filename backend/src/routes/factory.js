import express from "express";
import { repo } from "../db/repos/crm.js";
import { findUserById } from "../db/repos/users.js";
import { runQuery } from "../utils/query.js";
import { asyncHandler, badRequest, forbidden, notFound } from "../utils/asyncHandler.js";
import { validate } from "../validation/resources.js";
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

      const ownership = await applyOwnership(config, existing, req);

      res.json(
        await records.update(req.organizationId, existing.id, {
          ...withDefaults(config, value),
          ...ownership,
        }),
      );
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const row = await findEditable(req.params.id, req, "delete");
      res.json(await records.remove(req.organizationId, row.id));
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

function singular(name) {
  return name.endsWith("s") ? name.slice(0, -1) : name;
}
