import express from "express";
import { notesRepo } from "../db/repos/activity.js";
import { repo } from "../db/repos/crm.js";
import { requireAuth } from "../auth/requireAuth.js";
import { resources } from "../validation/resources.js";
import { entityConfig, validateNote } from "../validation/noteSchema.js";
import { can, canViewRow } from "../auth/permissions.js";
import { asyncHandler, badRequest, forbidden, notFound } from "../utils/asyncHandler.js";

const router = express.Router();

// A note inherits the visibility of the record it hangs off, and is read inside
// the same organization. Without either check, a user could read the activity
// history of a deal they are not allowed to see simply by guessing its id.
async function resolveEntity(entityType, entityId, req) {
  const config = entityConfig(entityType);
  if (!config) throw notFound("Unknown record type");

  const collection = resources[config.collection];
  const row = await repo(config.collection).findById(req.organizationId, entityId);

  if (!row) throw notFound("Record not found");

  if (
    !can(req.user, collection.permissionName, "view") ||
    !canViewRow(req.user, collection.permissionName, row)
  ) {
    throw notFound("Record not found");
  }

  return row;
}

router.use(requireAuth);

// GET /notes?entityType=customer&entityId=c001
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId) {
      throw badRequest("Validation failed", {
        entityType: !entityType ? "entityType is required" : undefined,
        entityId: !entityId ? "entityId is required" : undefined,
      });
    }

    // Throws 404 if the caller cannot see the parent record, so the notes of an
    // inaccessible deal are not readable.
    await resolveEntity(entityType, entityId, req);

    const notes = await notesRepo.listForEntity(req.organizationId, entityType, entityId);
    res.json(notes);
  }),
);

// POST /notes
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { value, errors } = validateNote(req.body);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    const { entityType, entityId, body } = value;
    await resolveEntity(entityType, entityId, req);

    // Deleting a record removes its timeline with it, so notes cannot outlive
    // the thing they describe.
    const note = await notesRepo.insert(req.organizationId, {
      entityType,
      entityId,
      body,
      authorId: req.user.id,
      authorName: req.user.name,
    });

    res.status(201).json(note);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const note = await notesRepo.findById(req.organizationId, req.params.id);
    if (!note) throw notFound("Note not found");

    // Events are the record's own history — a stage change that happened. They
    // are not editable notes, so nobody can remove them, an admin included.
    if (note.kind === "event") {
      throw forbidden("This is an automatic history entry and cannot be deleted");
    }

    // Authors can remove their own notes; admins can remove any of them.
    if (req.user.role !== "admin" && note.authorId !== req.user.id) {
      throw forbidden("You can only delete your own notes");
    }

    // Still verify the parent is visible, so the 404/403 split stays consistent.
    await resolveEntity(note.entityType, note.entityId, req);

    res.json(await notesRepo.remove(req.organizationId, note.id));
  }),
);

export default router;
