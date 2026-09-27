import express from "express";
import * as store from "../db/store.js";
import { requireAuth } from "../auth/requireAuth.js";
import { resources } from "../validation/resources.js";
import { entityConfig } from "../validation/noteSchema.js";
import { validateFollowUp, validateFollowUpUpdate } from "../validation/followUpSchema.js";
import { isEmailConfigured, sendEmail } from "../services/email.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";

const router = express.Router();

// Follow-ups inherit the visibility of their parent record, for the same reason
// notes do: otherwise guessing a deal id would leak its follow-up schedule.
function resolveEntity(entityType, entityId, user) {
  const config = entityConfig(entityType);
  if (!config) throw notFound("Unknown record type");

  const row = store.findById(config.collection, entityId);
  if (!row) throw notFound("Record not found");

  const visibleTo = resources[config.collection]?.visibleTo ?? (() => true);
  if (!visibleTo(user, row)) throw notFound("Record not found");

  return row;
}

// Contact address for the parent record, used as the email recipient. Deals do
// not store an email — they reference a customer by name — so a deal follow-up
// has no address of its own to send to.
function contactFor(entityType, entityId) {
  const config = entityConfig(entityType);
  const row = config ? store.findById(config.collection, entityId) : null;
  return row?.email ?? null;
}

function contactNameFor(entityType, entityId) {
  const config = entityConfig(entityType);
  const row = config ? store.findById(config.collection, entityId) : null;
  return row?.name ?? row?.title ?? "";
}

router.use(requireAuth);

// GET /followups?entityType=customer&entityId=c001
router.get("/", (req, res) => {
  const { entityType, entityId, status, scope } = req.query;

  let rows = store.all("followups");

  if (entityType || entityId) {
    if (!entityType || !entityId) {
      throw badRequest("Validation failed", {
        entityType: !entityType ? "entityType is required" : undefined,
        entityId: !entityId ? "entityId is required" : undefined,
      });
    }

    resolveEntity(entityType, entityId, req.user);
    rows = rows.filter(
      (row) => row.entityType === entityType && row.entityId === String(entityId),
    );
  } else if (scope !== "all") {
    // Default listing is everything the caller can see, across all records.
    const visible = new Set();
    for (const [name, config] of Object.entries(resources)) {
      if (!config.visibleTo) continue;
      for (const row of store.all(name)) {
        if (config.visibleTo(req.user, row)) visible.add(`${name}:${row.id}`);
      }
    }

    rows = rows.filter((row) => visible.has(`${entityCollection(row.entityType)}:${row.entityId}`));
  }

  if (status) {
    rows = rows.filter((row) => row.status === status);
  }

  // Soonest due date first, so the next thing to do is at the top.
  res.json([...rows].sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt))));
});

// POST /followups
router.post("/", (req, res) => {
  const { value, errors } = validateFollowUp(req.body);
  if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

  const { entityType, entityId, title, type, dueAt, details } = value;
  resolveEntity(entityType, entityId, req.user);

  const followUp = store.insert("followups", {
    entityType,
    entityId,
    title,
    type,
    dueAt,
    details,
    status: "pending",
    createdBy: req.user.id,
    createdByName: req.user.name,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(followUp);
});

// PATCH /followups/:id — used to reschedule and to mark done.
router.patch("/:id", (req, res) => {
  const followUp = store.findById("followups", req.params.id);
  if (!followUp) throw notFound("Follow-up not found");

  resolveEntity(followUp.entityType, followUp.entityId, req.user);

  const { value, errors } = validateFollowUpUpdate(req.body);
  if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

  if (value.status === "done" && followUp.status !== "done") {
    value.completedAt = new Date().toISOString();
  }

  if (value.status === "pending") {
    value.completedAt = null;
  }

  res.json(store.update("followups", followUp.id, value));
});

router.delete("/:id", (req, res) => {
  const followUp = store.findById("followups", req.params.id);
  if (!followUp) throw notFound("Follow-up not found");

  resolveEntity(followUp.entityType, followUp.entityId, req.user);

  const owns = followUp.createdBy === req.user.id;
  if (req.user.role !== "admin" && !owns) {
    throw forbidden("You can only delete follow-ups you created");
  }

  res.json(store.remove("followups", followUp.id));
});

// POST /followups/:id/notify — sends the reminder email for a follow-up.
//
// Returns 200 with `sent: false` and a reason when no provider is configured,
// so the client can fall back to a mailto: link instead of showing an error.
router.post("/:id/notify", async (req, res) => {
  const followUp = store.findById("followups", req.params.id);
  if (!followUp) throw notFound("Follow-up not found");

  resolveEntity(followUp.entityType, followUp.entityId, req.user);

  const to = contactFor(followUp.entityType, followUp.entityId);
  const contactName = contactNameFor(followUp.entityType, followUp.entityId);

  if (!to) {
    return res.json({
      sent: false,
      reason:
        followUp.entityType === "deal"
          ? "This deal has no contact email of its own. Send the reminder from the linked customer instead."
          : "This record has no email address on file.",
      mailto: null,
      providerConfigured: isEmailConfigured(),
    });
  }

  const result = await sendEmail({
    to,
    subject: `Follow-up: ${followUp.title}`,
    text: [
      `Reminder for ${contactName}.`,
      "",
      `${followUp.title} — due ${followUp.dueAt}.`,
      followUp.details || "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  res.json({
    ...result,
    // Lets the client build a mailto: without duplicating the subject/body.
    mailto: to
      ? `mailto:${to}?subject=${encodeURIComponent(`Follow-up: ${followUp.title}`)}`
      : null,
    providerConfigured: isEmailConfigured(),
  });
});

function entityCollection(entityType) {
  return entityType === "deal" ? "deals" : "customers";
}

export default router;
