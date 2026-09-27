import express from "express";
import * as store from "../db/store.js";
import { runQuery } from "../utils/query.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { validate } from "../validation/resources.js";
import { isAdmin } from "../auth/roles.js";

// Builds CRUD routes for one collection. The three resources differ only in
// their fields, validation and access rules, so they share this implementation.
export function createResourceRouter(name, config) {
  const router = express.Router();
  const visibleTo = config.visibleTo ?? (() => true);
  const editableBy = config.editableBy ?? (() => true);

  // Filters the collection down to what this user is allowed to see.
  const visibleRows = (rows, user) => rows.filter((row) => visibleTo(user, row));

  // Resolves a record for reading, or throws 404. A record the user cannot see
  // is reported as missing rather than forbidden, so the API does not confirm
  // the existence of records someone has no access to.
  const findVisible = (id, user) => {
    const row = store.findById(name, id);
    if (!row || !visibleTo(user, row)) throw notFound(`${singular(name)} not found`);
    return row;
  };

  // Resolves a record for writing. 403 here, because the user already knows
  // the record exists — they were just sent to it by a list they can see.
  const findEditable = (id, user) => {
    const row = findVisible(id, user);
    if (!editableBy(user, row)) throw forbidden();
    return row;
  };

  router.get("/", (req, res) => {
    res.json(runQuery(visibleRows(store.all(name), req.user), req.query, config));
  });

  router.get("/:id", (req, res) => {
    res.json(findVisible(req.params.id, req.user));
  });

  router.post("/", (req, res) => {
    const { value, errors } = validate(config, req.body, { partial: false });
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    // A rep creating a record owns it from the start, so it shows up in their
    // list immediately. An admin may set the owner explicitly.
    const ownership = applyOwnership(config, null, req);

    const created = store.insert(name, {
      ...withDefaults(config, value, req),
      ...ownership,
    });

    res.status(201).json(created);
  });

  // PUT is treated as a full replace, matching what the frontend sends (it
  // always submits the whole row). id and server-owned fields stay fixed.
  router.put("/:id", (req, res) => {
    const existing = findEditable(req.params.id, req.user);

    const { value, errors } = validate(config, req.body, { partial: false });
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    const ownership = applyOwnership(config, existing, req);

    res.json(
      store.update(name, req.params.id, { ...withDefaults(config, value, req), ...ownership }),
    );
  });

  router.delete("/:id", (req, res) => {
    const row = findEditable(req.params.id, req.user);
    res.json(store.remove(name, row.id));
  });

  return router;
}

// Works out the owner fields for a write.
//
// Reps always own what they create, and cannot hand a record to someone else —
// otherwise "see only your own records" would be trivially bypassable. Only an
// admin can reassign, and reassignment also updates the display name so the
// two never disagree.
function applyOwnership(config, existing, req) {
  if (!config.owned) return {};

  const idField = config.ownerField;
  const labelField = config.ownerLabelField;
  const { user } = req;

  if (isAdmin(user)) {
    const requested = req.body?.ownerId;
    const newOwnerId = requested === undefined ? (existing?.ownerId ?? null) : requested;

    const owner = newOwnerId ? store.findById("users", newOwnerId) : null;

    // Guard against pointing a record at a user that does not exist.
    if (newOwnerId && !owner) throw badRequest("Validation failed", { ownerId: "Unknown user" });

    return { [idField]: owner?.id ?? null, [labelField]: owner?.name ?? "Unassigned" };
  }

  // A rep creating a record owns it; a rep editing keeps the current owner.
  if (!existing) return { [idField]: user.id, [labelField]: user.name };

  return { [idField]: existing[idField] ?? user.id, [labelField]: existing[labelField] ?? user.name };
}

function withDefaults(config, value, req) {
  const row = { ...value };

  // Only deals and leads carry a createdDate, and clients never set it.
  if (config.fields.includes("createdDate") && !row.createdDate) {
    row.createdDate = new Date().toISOString().slice(0, 10);
  }

  return row;
}

function singular(name) {
  return name.endsWith("s") ? name.slice(0, -1) : name;
}
