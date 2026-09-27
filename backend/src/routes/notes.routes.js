import express from "express";
import * as store from "../db/store.js";
import { requireAuth } from "../auth/requireAuth.js";
import { resources } from "../validation/resources.js";
import { entityConfig, validateNote } from "../validation/noteSchema.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";

const router = express.Router();

// A note inherits the visibility of the record it hangs off. Without this, a rep
// could read the activity history of a deal they are not allowed to see simply
// by guessing its id.
function resolveEntity(entityType, entityId, user) {
  const config = entityConfig(entityType);
  if (!config) throw notFound("Unknown record type");

  const collection = resources[config.collection];
  const row = store.findById(config.collection, entityId);

  if (!row) throw notFound("Record not found");

  const visibleTo = collection?.visibleTo ?? (() => true);
  if (!visibleTo(user, row)) throw notFound("Record not found");

  return row;
}

router.use(requireAuth);

// GET /notes?entityType=customer&entityId=c001
router.get("/", (req, res) => {
  const { entityType, entityId } = req.query;

  if (!entityType || !entityId) {
    throw badRequest("Validation failed", {
      entityType: !entityType ? "entityType is required" : undefined,
      entityId: !entityId ? "entityId is required" : undefined,
    });
  }

  // Throws 404 if the caller cannot see the parent record, so the notes of an
  // inaccessible deal are not readable.
  resolveEntity(entityType, entityId, req.user);

  const notes = store
    .all("notes")
    .filter((note) => note.entityType === entityType && note.entityId === String(entityId))
    // Newest first, matching the timeline in the UI.
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  res.json(notes);
});

// POST /notes
router.post("/", (req, res) => {
  const { value, errors } = validateNote(req.body);
  if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

  const { entityType, entityId, body } = value;
  resolveEntity(entityType, entityId, req.user);

  // Deleting a record removes its timeline with it, so notes cannot outlive
  // the thing they describe.
  const note = store.insert("notes", {
    entityType,
    entityId,
    body,
    authorId: req.user.id,
    authorName: req.user.name,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(note);
});

router.delete("/:id", (req, res) => {
  const note = store.findById("notes", req.params.id);
  if (!note) throw notFound("Note not found");

  // Authors can remove their own notes; admins can remove any of them.
  if (req.user.role !== "admin" && note.authorId !== req.user.id) {
    throw forbidden("You can only delete your own notes");
  }

  // Still verify the parent is visible, so the 404/403 split stays consistent.
  resolveEntity(note.entityType, note.entityId, req.user);

  res.json(store.remove("notes", note.id));
});

export default router;
