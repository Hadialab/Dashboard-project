import express from "express";
import { followUpsRepo } from "../db/repos/activity.js";
import { repo } from "../db/repos/crm.js";
import { requireAuth } from "../auth/requireAuth.js";
import { resources } from "../validation/resources.js";
import { entityConfig } from "../validation/noteSchema.js";
import { validateFollowUp, validateFollowUpUpdate } from "../validation/followUpSchema.js";
import { can, canViewRow } from "../auth/permissions.js";
import { isEmailConfigured, sendEmail } from "../services/email.js";
import { templates } from "../services/emailTemplates.js";
import { config } from "../config.js";
import { asyncHandler, badRequest, forbidden, notFound } from "../utils/asyncHandler.js";

const router = express.Router();

// Follow-ups inherit the visibility of their parent record, for the same reason
// notes do: otherwise guessing a deal id would leak its follow-up schedule.
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

// Contact address for the parent record, used as the email recipient. Deals do
// not store an email — they reference a customer by name — so a deal follow-up
// has no address of its own to send to.
async function contactFor(entityType, entityId, organizationId) {
  const config = entityConfig(entityType);
  const row = config ? await repo(config.collection).findById(organizationId, entityId) : null;
  return row?.email ?? null;
}

async function contactNameFor(entityType, entityId, organizationId) {
  const config = entityConfig(entityType);
  const row = config ? await repo(config.collection).findById(organizationId, entityId) : null;
  return row?.name ?? row?.title ?? "";
}

// Whether the caller may see follow-ups attached to a given record.
//
// Checked against the parent record rather than precomputed into a set, so a
// collection with no per-row ownership (customers) is still covered.
async function canSee(entityType, entityId, req) {
  const config = entityConfig(entityType);
  if (!config) return false;

  const collection = resources[config.collection];
  const row = await repo(config.collection).findById(req.organizationId, entityId);
  if (!row) return false;

  return (
    can(req.user, collection.permissionName, "view") &&
    canViewRow(req.user, collection.permissionName, row)
  );
}

router.use(requireAuth);

// GET /followups?entityType=customer&entityId=c001
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { entityType, entityId, status, scope } = req.query;

    if (entityType || entityId) {
      if (!entityType || !entityId) {
        throw badRequest("Validation failed", {
          entityType: !entityType ? "entityType is required" : undefined,
          entityId: !entityId ? "entityId is required" : undefined,
        });
      }

      await resolveEntity(entityType, entityId, req);

      const rows = await followUpsRepo.listForEntity(
        req.organizationId,
        entityType,
        entityId,
      );

      res.json(status ? rows.filter((row) => row.status === status) : rows);
      return;
    }

    // Default listing: the caller's whole company, then filtered down to the
    // follow-ups whose parent record they are allowed to see. Asking for
    // ?scope=all is a UI hint and still respects visibility.
    const all = await followUpsRepo.listAll(req.organizationId);

    const allowed = await Promise.all(
      all.map(async (row) => (await canSee(row.entityType, row.entityId, req) ? row : null)),
    );

    const rows = allowed.filter(Boolean).filter((row) => !status || row.status === status);

    res.json(rows);
  }),
);

// POST /followups
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { value, errors } = validateFollowUp(req.body);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    const { entityType, entityId, title, type, dueAt, details } = value;
    await resolveEntity(entityType, entityId, req);

    const followUp = await followUpsRepo.insert(req.organizationId, {
      entityType,
      entityId,
      title,
      type,
      dueAt,
      details,
      createdBy: req.user.id,
      createdByName: req.user.name,
    });

    res.status(201).json(followUp);
  }),
);

// PATCH /followups/:id — used to reschedule and to mark done.
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const followUp = await followUpsRepo.findById(req.organizationId, req.params.id);
    if (!followUp) throw notFound("Follow-up not found");

    await resolveEntity(followUp.entityType, followUp.entityId, req);

    const { value, errors } = validateFollowUpUpdate(req.body);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    if (value.status === "done" && followUp.status !== "done") {
      value.completedAt = new Date().toISOString();
    }

    if (value.status === "pending") {
      value.completedAt = null;
    }

    res.json(await followUpsRepo.update(req.organizationId, followUp.id, value));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const followUp = await followUpsRepo.findById(req.organizationId, req.params.id);
    if (!followUp) throw notFound("Follow-up not found");

    await resolveEntity(followUp.entityType, followUp.entityId, req);

    const owns = followUp.createdBy === req.user.id;
    if (req.user.role !== "admin" && !owns) {
      throw forbidden("You can only delete follow-ups you created");
    }

    res.json(await followUpsRepo.remove(req.organizationId, followUp.id));
  }),
);

// POST /followups/:id/notify — sends the reminder email for a follow-up.
//
// Returns 200 with `sent: false` and a reason when no provider is configured,
// so the client can fall back to a mailto: link instead of showing an error.
router.post(
  "/:id/notify",
  asyncHandler(async (req, res) => {
    const followUp = await followUpsRepo.findById(req.organizationId, req.params.id);
    if (!followUp) throw notFound("Follow-up not found");

    await resolveEntity(followUp.entityType, followUp.entityId, req);

    const to = await contactFor(followUp.entityType, followUp.entityId, req.organizationId);
    const contactName = await contactNameFor(
      followUp.entityType,
      followUp.entityId,
      req.organizationId,
    );

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

    // The template owns the subject and body, so the mail client gets the same
    // wording as the email and neither can drift from the other.
    const reminder = templates.followUpReminder({
      contactName,
      title: followUp.title,
      dueAt: followUp.dueAt,
      details: followUp.details,
      appUrl: config.appUrl,
    });

    const result = await sendEmail({
      ...reminder,
      to,
      template: "follow_up_reminder",
      userId: req.user.id,
      organizationId: req.organizationId,
    });

    res.json({
      ...result,
      // Lets the client build a mailto: without duplicating the subject/body.
      mailto: `mailto:${to}?subject=${encodeURIComponent(reminder.subject)}`,
      providerConfigured: isEmailConfigured(),
    });
  }),
);

export default router;
