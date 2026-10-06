import express from "express";

import {
  API_KEY_SCOPES,
  deleteWebhook,
  generateApiKey,
  generateSigningSecret,
  insertApiKey,
  insertWebhook,
  listApiKeys,
  listWebhooks,
  normalizeScopes,
  revokeApiKey,
  setWebhookActive,
} from "../db/repos/apiKeys.js";
import { findOrganizationById } from "../db/repos/users.js";
import { requireAuth } from "../auth/requireAuth.js";
import { requireRole } from "../auth/roles.js";
import { query } from "../db/pool.js";
import { DEFAULT_PERMISSIONS, normalizePermissions } from "../auth/permissions.js";
import { insertAuditEntry } from "../db/repos/audit.js";
import { asyncHandler, badRequest, conflict, notFound } from "../utils/asyncHandler.js";

const router = express.Router();

// Tenant administration.
//
// Every route here is admin-only, and none of it goes through the permission table.
// That table governs *CRM data* — who may see which customers. This is configuration
// about the company itself, which is exactly the thing an admin manages and a rep
// does not: their own company's API keys and webhook endpoints are as sensitive as
// its password policy, and a rep who can read them can read the audit log.
//
// Scope discipline: this is deliberately not SSO, not per-tenant schema, and not
// data residency. Each of those is a project.

router.use(requireAuth, requireRole("admin"));

// ===== Company settings =====

/**
 * The settings row, created on first read.
 *
 * Created lazily rather than by a migration, because a migration cannot know which
 * organizations exist on a database with data in it, and `INSERT ... ON CONFLICT`
 * per row at read time costs nothing and cannot get it wrong.
 */
async function loadSettings(organizationId) {
  const { rows } = await query(
    `INSERT INTO organization_settings (organization_id)
     VALUES ($1)
     ON CONFLICT (organization_id) DO UPDATE SET organization_id = EXCLUDED.organization_id
     RETURNING organization_id, display_name, logo_url, website, support_email,
               default_role, default_permissions, locale, timezone, updated_at`,
    [organizationId],
  );

  const row = rows[0];
  const organization = await findOrganizationById(organizationId);

  return {
    // Falls back to the organization's own name, which is what the app showed before
    // this table existed. An empty display name must not render as a blank header.
    displayName: row.display_name || organization?.name || "",
    logoUrl: row.logo_url,
    website: row.website,
    supportEmail: row.support_email,
    defaultRole: row.default_role,
    defaultPermissions: normalizePermissions(row.default_permissions),
    locale: row.locale,
    timezone: row.timezone,
    organizationName: organization?.name ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    res.json(await loadSettings(req.organizationId));
  }),
);

router.patch(
  "/settings",
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    if (body.displayName !== undefined && String(body.displayName).trim().length < 2) {
      throw badRequest("Validation failed", {
        displayName: "Display name must be at least 2 characters",
      });
    }

    // Only accept http(s) URLs for the logo and the website. This is a value that
    // goes into an <img src> and a link in every customer's session, so a
    // `javascript:` or `data:` value would be a stored XSS in the header of the
    // whole app. Validating here rather than trusting the UI.
    for (const field of ["logoUrl", "website"]) {
      const value = body[field];

      if (value === undefined || value === null || value === "") continue;

      if (!/^https?:\/\/[^\s]+$/i.test(String(value))) {
        throw badRequest("Validation failed", {
          [field]: "Must be an http or https URL",
        });
      }
    }

    if (body.supportEmail !== undefined && body.supportEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.supportEmail))) {
        throw badRequest("Validation failed", {
          supportEmail: "Enter a valid email address",
        });
      }
    }

    if (body.defaultRole !== undefined && !["admin", "rep"].includes(body.defaultRole)) {
      throw badRequest("Validation failed", { defaultRole: "Must be admin or rep" });
    }

    // A PATCH, so an absent field means "leave it alone" rather than "clear it".
    //
    // The COALESCE has to appear in the *values* too, not only in the DO UPDATE:
    // the INSERT runs first, and a bare null for a NOT NULL column is rejected
    // before the upsert ever gets a chance to substitute the existing value. So the
    // columns that have a database default are given it explicitly.
    const { rows } = await query(
      `INSERT INTO organization_settings
         (organization_id, display_name, logo_url, website, support_email,
          default_role, default_permissions, locale, timezone)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'rep'), COALESCE($7, '{}'::jsonb), COALESCE($8, 'en-GB'), COALESCE($9, 'UTC'))
       ON CONFLICT (organization_id) DO UPDATE SET
         display_name        = COALESCE($2, organization_settings.display_name),
         logo_url            = COALESCE($3, organization_settings.logo_url),
         website             = COALESCE($4, organization_settings.website),
         support_email       = COALESCE($5, organization_settings.support_email),
         default_role        = COALESCE($6, organization_settings.default_role),
         default_permissions = COALESCE($7, organization_settings.default_permissions),
         locale              = COALESCE($8, organization_settings.locale),
         timezone            = COALESCE($9, organization_settings.timezone),
         updated_at          = now()
       RETURNING organization_id`,
      [
        req.organizationId,
        body.displayName?.trim() ?? null,
        body.logoUrl || null,
        body.website || null,
        body.supportEmail || null,
        body.defaultRole ?? null,
        body.defaultPermissions ? JSON.stringify(body.defaultPermissions) : null,
        body.locale ?? null,
        body.timezone ?? null,
      ],
    );

    if (!rows[0]) throw notFound("Settings not found");

    await insertAuditEntry(req.organizationId, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "update",
      entityType: "user",
      entityId: String(req.user.organization_id),
      entityLabel: "Organization settings",
      changes: Object.fromEntries(
        Object.keys(body).map((key) => [key, { from: null, to: "(changed)" }]),
      ),
    });

    res.json(await loadSettings(req.organizationId));
  }),
);

/** The defaults a new teammate would receive right now. */
router.get(
  "/settings/defaults",
  asyncHandler(async (req, res) => {
    const settings = await loadSettings(req.organizationId);

    res.json({
      defaultRole: settings.defaultRole,
      defaultPermissions: settings.defaultPermissions,
      // The hardcoded fallback, so the UI can explain what the default is without
      // knowing how the server defines it.
      fallback: { role: "rep", permissions: DEFAULT_PERMISSIONS },
    });
  }),
);

// ===== API keys =====

router.get(
  "/api-keys",
  asyncHandler(async (req, res) => {
    res.json({
      keys: await listApiKeys(req.organizationId),
      // The vocabulary, so a client cannot guess at the scope names and find out.
      availableScopes: API_KEY_SCOPES,
    });
  }),
);

/**
 * Mints a key.
 *
 * The plaintext is in this response and nowhere else, ever. That is the whole
 * contract: the caller has to write it down now, because there is no way to
 * retrieve it later and no way to recover it.
 */
router.post(
  "/api-keys",
  asyncHandler(async (req, res) => {
    const label = String(req.body?.label ?? "").trim();

    if (label.length < 2) {
      throw badRequest("Validation failed", { label: "Give the key a name you will recognise" });
    }

    const scopes = normalizeScopes(req.body?.scopes);
    const generated = generateApiKey();

    const key = await insertApiKey(
      req.organizationId,
      { label, prefix: generated.prefix, hash: generated.hash, scopes },
      req.user,
    );

    await insertAuditEntry(req.organizationId, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "permission_change",
      entityType: "user",
      entityId: String(key.id),
      entityLabel: `API key "${label}"`,
      // The key itself is not recorded, anywhere, ever.
      changes: {
        apiKey: { from: null, to: `created with ${scopes.length} scope(s)` },
      },
    });

    res.status(201).json({
      ...key,
      // Shown once. Stated in the field name too, so a caller who ignores this
      // message still gets the hint.
      apiKeyOneTimeSecret: generated.plaintext,
    });
  }),
);

/**
 * Revokes a key.
 *
 * Revoked rather than deleted, so an audit reader can still see that a key existed
 * and when it stopped working. A deleted row leaves no trace.
 */
router.delete(
  "/api-keys/:id",
  asyncHandler(async (req, res) => {
    const revoked = await revokeApiKey(req.organizationId, req.params.id);
    if (!revoked) throw notFound("Key not found, or already revoked");

    await insertAuditEntry(req.organizationId, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "permission_change",
      entityType: "user",
      entityId: String(req.params.id),
      entityLabel: `API key "${revoked.label}"`,
      changes: { apiKey: { from: "active", to: "revoked" } },
    });

    res.json({ id: String(revoked.id), label: revoked.label, revoked: true });
  }),
);

// ===== Webhooks =====

router.get(
  "/webhooks",
  asyncHandler(async (req, res) => {
    res.json({ webhooks: await listWebhooks(req.organizationId) });
  }),
);

router.post(
  "/webhooks",
  asyncHandler(async (req, res) => {
    const label = String(req.body?.label ?? "").trim();
    const targetUrl = String(req.body?.targetUrl ?? "").trim();

    if (label.length < 2) {
      throw badRequest("Validation failed", { label: "Give the webhook a name" });
    }

    // This value is fetched by the server, so `file:` or an internal address would
    // make the API a request forwarder — it would fetch things a caller cannot
    // reach themselves and hand the result to whoever controls the subscription.
    //
    // https is required everywhere except loopback. That exception is deliberate:
    // it is what makes the feature testable and usable against an internal service
    // on the same host, and it is not a hole — a request to 127.0.0.1 leaves the
    // machine and can only reach a listener the operator already runs.
    if (!/^https:\/\/[^\s]+$/i.test(targetUrl) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(targetUrl)) {
      throw badRequest("Validation failed", {
        targetUrl: "Must be an https URL (http is allowed only for localhost)",
      });
    }

    const events = Array.isArray(req.body?.events)
      ? req.body.events.map(String).filter(Boolean).slice(0, 20)
      : [];

    const hook = await insertWebhook(
      req.organizationId,
      { label, targetUrl, events, signingSecret: generateSigningSecret() },
      req.user,
    );

    await insertAuditEntry(req.organizationId, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "permission_change",
      entityType: "user",
      entityId: String(hook.id),
      entityLabel: `Webhook "${label}"`,
      changes: {
        webhook: { from: null, to: events.length ? events.join(", ") : "all events" },
      },
    });

    res.status(201).json({
      ...hook,
      isActive: true,
      signingSecretOneTimeSecret: hook.signing_secret,
    });
  }),
);

router.patch(
  "/webhooks/:id",
  asyncHandler(async (req, res) => {
    if (typeof req.body?.isActive !== "boolean") {
      throw badRequest("Validation failed", { isActive: "Must be true or false" });
    }

    const updated = await setWebhookActive(
      req.organizationId,
      req.params.id,
      req.body.isActive,
    );
    if (!updated) throw notFound("Webhook not found");

    res.json({ id: String(updated.id), isActive: updated.is_active });
  }),
);

router.delete(
  "/webhooks/:id",
  asyncHandler(async (req, res) => {
    const removed = await deleteWebhook(req.organizationId, req.params.id);
    if (!removed) throw notFound("Webhook not found");

    await insertAuditEntry(req.organizationId, {
      actorId: req.user.id,
      actorName: req.user.name,
      action: "permission_change",
      entityType: "user",
      entityId: String(removed.id),
      entityLabel: `Webhook "${removed.label}"`,
      changes: { webhook: { from: "active", to: "deleted" } },
    });

    res.json({ id: String(removed.id), label: removed.label, deleted: true });
  }),
);

// A conflict guard for the labels, which is the one field with no natural key and
// so the only way two rows can end up indistinguishable in the list.
router.post(
  "/api-keys/check-label",
  asyncHandler(async (req, res) => {
    const label = String(req.body?.label ?? "").trim().toLowerCase();

    const { rows } = await query(
      `SELECT 1 FROM api_keys WHERE organization_id = $1 AND lower(label) = $2 AND revoked_at IS NULL`,
      [req.organizationId, label],
    );

    if (rows.length > 0) throw conflict("A live key already uses that name");

    res.json({ available: true });
  }),
);

export default router;