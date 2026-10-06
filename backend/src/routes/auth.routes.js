import express from "express";
import bcrypt from "bcryptjs";
import {
  createOrganizationWithOwner,
  deleteUser,
  findOrganizationById,
  findUserByEmail,
  findUserById,
  insertUser,
  listUsers,
  setUserPassword,
  updateUser,
} from "../db/repos/users.js";
import { releaseCreator } from "../db/repos/activity.js";
import { insertAuditEntry } from "../db/repos/audit.js";
import {
  buildResetUrl,
  canIssueResetToken,
  consumeResetToken,
  findUserByResetToken,
  generateResetToken,
  insertResetToken,
  invalidateResetTokens,
} from "../db/repos/passwordReset.js";
import { sendEmail, RESET_TOKEN_TTL_MINUTES } from "../services/email.js";
import { templates } from "../services/emailTemplates.js";
import { signToken } from "../auth/tokens.js";
import { requireAuth } from "../auth/requireAuth.js";
import { config } from "../config.js";
import { ROLES, requireRole } from "../auth/roles.js";
import {
  DEFAULT_PERMISSIONS,
  normalizePermissions,
  UNRESTRICTED_PERMISSIONS,
  validatePermissions,
} from "../auth/permissions.js";
import { validateLogin, validateNewUser, validateRegistration } from "../validation/userSchema.js";
import {
  RESET_TOKEN_PATTERN,
  validateForgotPassword,
  validateResetPassword,
} from "../validation/passwordResetSchema.js";
import { describeCreation, describeDeletion, diffRecord, hasChanges } from "../audit/diff.js";
import { asyncHandler, badRequest, conflict, notFound, unauthorized } from "../utils/asyncHandler.js";

const router = express.Router();

// Hash of a value nobody can supply. Comparing against it when the email is
// unknown keeps login responses uniform in both message and timing.
const DUMMY_HASH = bcrypt.hashSync("no-such-account", 10);

// What the client is allowed to see. Deliberately no password_hash.
function publicUser(user) {
  return {
    id: user.id,
    organizationId: user.organization_id,
    name: user.name,
    email: user.email,
    role: user.role,
    // Normalized on the way out, so the client always receives a complete set.
    //
    // An admin bypasses every permission check, so whatever is stored on the row
    // is inert for them. Reporting that stored object anyway was actively
    // misleading: the Access editor showed an admin as unable to delete a
    // customer, and anyone reading the API response had to know the bypass rule
    // to understand it. Admins are therefore reported as unrestricted, which is
    // both true and what the UI needs in order to render the right controls.
    permissions: user.role === "admin" ? UNRESTRICTED_PERMISSIONS : normalizePermissions(user.permissions),
  };
}

/**
 * Creates a company and its first admin.
 *
 * There is no seeded account and no way to promote yourself into an existing
 * company, so every signup is a new tenant. The person registering becomes that
 * company's admin and can then add their own team.
 */
// Every handler below is wrapped in asyncHandler. Express 4 only catches
// synchronous throws, so an unwrapped async route turns a handled 404 into an
// unhandled rejection that takes the whole API process down with it.
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { value, errors } = validateRegistration(req.body);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    if (await findUserByEmail(value.email)) {
      throw conflict("An account with this email already exists", {
        email: "Email is already registered",
      });
    }

    const { user } = await createOrganizationWithOwner({
      organizationName: value.organizationName,
      name: value.name,
      email: value.email,
      passwordHash: bcrypt.hashSync(value.password, 10),
      // An admin ignores permissions, but storing the defaults keeps the shape
      // uniform if they are ever demoted.
      permissions: DEFAULT_PERMISSIONS,
    });

    // Best-effort, and deliberately after the response is built. A welcome email is
    // a courtesy: if the provider is down or slow, the signup must still succeed,
    // and a user who cannot receive it is no less able to work. `sendEmail` never
    // throws for that reason, and the attempt is recorded either way.
    const welcome = templates.welcome({ name: user.name, appUrl: config.appUrl });

    void sendEmail({
      ...welcome,
      to: user.email,
      template: "welcome",
      userId: user.id,
      organizationId: user.organization_id,
    });

    res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
      // Returned so the UI can show which workspace the user just joined.
      organization: { id: user.organization_id, name: value.organizationName },
    });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { value, errors } = validateLogin(req.body);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    const user = await findUserByEmail(value.email);

    // Same message and a real bcrypt comparison either way, so the response does
    // not reveal whether an email is registered.
    const passwordMatches = bcrypt.compareSync(
      value.password,
      user?.password_hash ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw unauthorized("Invalid email or password");
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

// ===== Password reset =====
//
// The two properties this section is built around, both of which are easy to get
// subtly wrong and impossible to fix after the fact:
//
//   1. `forgot-password` must not reveal whether an address is registered. Same
//      message, same status code, and — the part that is easy to skip — the same
//      *shape* of work for both cases, so the response is also not a timing oracle.
//      A different message for a known address turns the form into a way to
//      enumerate every customer in the install.
//
//   2. A reset token is a bearer credential for a full account takeover. It is
//      stored hashed, expires in minutes, works exactly once, and every other
//      live token for that account is invalidated the moment it is spent.

// What every caller is told, whatever actually happened.
const RESET_REQUESTED =
  "If an account exists with that address, a reset link is on its way.";

// And the single answer for a token that cannot be used. Malformed, unknown,
// expired and already-used all land here, deliberately indistinguishable: the
// difference between them would tell an attacker which guesses were ever real.
const TOKEN_REJECTED = "This reset link is no longer valid. Request a new one.";

// ===== Forgot password =====

/**
 * Starts a reset.
 *
 * Returns the same response for every input, including a malformed one, a
 * non-existent address, and an address whose rate limit is exhausted.
 */
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { value, errors } = validateForgotPassword(req.body);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    const user = await findUserByEmail(value.email);

    if (user && (await canIssueResetToken(user.id))) {
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);

      await insertResetToken(user.id, token, expiresAt);

      const resetUrl = buildResetUrl(config.appUrl, token);

      void sendEmail({
        ...templates.passwordReset({
          name: user.name,
          resetUrl,
          ttlMinutes: RESET_TOKEN_TTL_MINUTES,
        }),
        to: user.email,
        template: "password_reset",
        userId: user.id,
        organizationId: user.organization_id,
      });
    }

    // Unconditional, and returned even when the address is unknown or the limit is
    // hit. Anything else here is an enumeration oracle.
    res.json({ message: RESET_REQUESTED });
  }),
);

// ===== Complete a reset =====

/**
 * Spends a token and sets a new password.
 *
 * The token is consumed and the password written in that order, and the
 * consumption is a conditional UPDATE rather than a read-then-write — so of two
 * simultaneous resets using the same token exactly one wins, and the loser gets
 * the same rejection as a bad token rather than silently overwriting the winner's
 * password.
 */
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { value, errors } = validateResetPassword(req.body);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    // The shape check and the lookup happen here rather than in the validator, so
    // that a token which is malformed, unknown, expired and already-used all reach
    // the same single rejection below. Splitting them puts a validation error on
    // one path and a different message on the others, and the difference tells an
    // attacker which 64-character strings were ever issued.
    const user = RESET_TOKEN_PATTERN.test(value.token)
      ? await findUserByResetToken(value.token)
      : null;

    // Conditional UPDATE, so of two simultaneous resets with the same token exactly
    // one updates a row and the other matches nothing.
    const spent = user ? await consumeResetToken(value.token) : 0;

    if (!user || spent === 0) {
      throw badRequest(TOKEN_REJECTED);
    }

    const updated = await setUserPassword(user.id, bcrypt.hashSync(value.password, 10));

    // Every other outstanding link for this account stops working. A link that was
    // forwarded before the user noticed the request should not survive the reset
    // that fixed the problem.
    await invalidateResetTokens(user.id);

    // The single most security-relevant event in the app, so it goes in the audit
    // log rather than only the server log. `actorId` is the user's own: a
    // self-service reset has no admin behind it, and attributing it to the actor
    // who performed it is both true and what an auditor needs — it means "this
    // account was reset by its owner" rather than "by somebody".
    await insertAuditEntry(user.organization_id, {
      actorId: user.id,
      actorName: user.name,
      action: "password_change",
      entityType: "user",
      entityId: String(user.id),
      entityLabel: user.name,
      // No hash, no token, no address. What changed is the password and nothing
      // about it is worth recording.
      changes: { password: { from: null, to: "changed" } },
    });

    // Deliberately no token in the response. Handing back a signed-in session here
    // would make a reset link a login bypass for anyone who found the email, and
    // the user is already at a password prompt with the password they just chose.
    res.json({ user: publicUser(updated) });
  }),
);

// Lets the frontend confirm a stored token is still valid on page load,
// instead of trusting whatever is in localStorage.
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const organization = await findOrganizationById(req.organizationId);
    res.json({
      user: publicUser(req.user),
      organization: organization ? { id: organization.id, name: organization.name } : null,
    });
  }),
);

// ===== Admin-only: team management, scoped to the caller's own company =====
//
// Every mutation to a user is audited, because a permission change is the one
// thing in this app where "who did this, and what did they change it from" has to
// survive the account being deleted afterwards. That is why these entries name
// the actor's user id as well as their name: actor_id goes null when the account
// is removed, but actor_name stays, and so does the log.

// Writes one entry after the change has been applied. Kept in one place so the
// five handlers below cannot drift into auditing different things.
async function auditUserChange(req, action, targetId, changes, targetName) {
  if (!hasChanges(changes)) return;

  await insertAuditEntry(req.organizationId, {
    actorId: req.user.id,
    actorName: req.user.name,
    action,
    entityType: "user",
    entityId: String(targetId),
    // The target's name, so the log says who gained or lost access rather than a
    // user id. Like the actor name, it outlives the account.
    entityLabel: targetName,
    changes,
  });
}

/**
 * Turns a permission change into a flat, readable diff.
 *
 * Flat, because the audit log is read by a person in a table: `customers.edit`
 * appearing as one row with an old and new value beats a nested object that has
 * to be unfolded to say anything.
 *
 * Only the actions that actually differ are listed, and the resource is named in
 * each key, so "granted access to view every customer's deals" is legible without
 * cross-referencing two blobs.
 */
function flattenPermissionDiff(before, after) {
  const changes = {};
  const resources_ = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  const actions = ["view", "create", "edit", "delete"];

  for (const resource of resources_) {
    for (const action of actions) {
      const from = before?.[resource]?.[action] ?? null;
      const to = after?.[resource]?.[action] ?? null;

      if (String(from) !== String(to)) {
        changes[`${resource}.${action}`] = { from, to };
      }
    }
  }

  return changes;
}

router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json((await listUsers(req.organizationId)).map(publicUser));
  }),
);

// Admin creates a rep inside their own company. The only way to make another
// admin, which is why it sits behind the admin gate.
router.post(
  "/users",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { value, errors } = validateNewUser(req.body);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    if (await findUserByEmail(value.email)) {
      throw conflict("An account with this email already exists", {
        email: "Email is already registered",
      });
    }

    const requestedRole = req.body?.role;
    if (requestedRole && !ROLES.includes(requestedRole)) {
      throw badRequest("Validation failed", {
        role: `Role must be one of: ${ROLES.join(", ")}`,
      });
    }

    const created = await insertUser(req.organizationId, {
      name: value.name,
      email: value.email,
      passwordHash: bcrypt.hashSync(value.password, 10),
      role: requestedRole ?? "rep",
      // The admin can hand over a specific set, or omit it for the defaults.
      permissions: req.body?.permissions
        ? normalizePermissions(req.body.permissions)
        : DEFAULT_PERMISSIONS,
    });

    // Recorded as a permission_change rather than a plain create, because adding
    // someone to the team *is* a permission grant — it is how access is given in
    // the first place. The permissions themselves are logged individually, since
    // "was given access to customers" is the question being asked months later.
    await auditUserChange(
      req,
      "permission_change",
      created.id,
      describeCreation(publicUser(created), ["name", "email", "role", "permissions"]),
      created.name,
    );

    res.status(201).json(publicUser(created));
  }),
);

router.patch(
  "/users/:id/role",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { role } = req.body ?? {};

    if (!ROLES.includes(role)) {
      throw badRequest("Validation failed", {
        role: `Role must be one of: ${ROLES.join(", ")}`,
      });
    }

    // Scoped to the caller's own company, so this is a 404 for anyone outside it
    // rather than a way to edit another company's team.
    const target = await findUserById(req.organizationId, req.params.id);
    if (!target) throw notFound("User not found");

    // Guard against removing the last admin, which would lock the company out of
    // its own team page.
    if (target.role === "admin" && role !== "admin") {
      const admins = (await listUsers(req.organizationId)).filter((u) => u.role === "admin");
      if (admins.length <= 1) throw conflict("Cannot demote the last administrator");
    }

    const updated = await updateUser(req.organizationId, target.id, { role });

    await auditUserChange(
      req,
      "permission_change",
      target.id,
      { role: { from: target.role, to: updated.role } },
      target.name,
    );

    res.json(publicUser(updated));
  }),
);

router.patch(
  "/users/:id/permissions",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const target = await findUserById(req.organizationId, req.params.id);
    if (!target) throw notFound("User not found");

    if (target.role === "admin") {
      throw conflict("Administrators always have full access, so there is nothing to change");
    }

    const { value, errors } = validatePermissions(req.body?.permissions);
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    // Merge over the current set so a partial update only changes what was sent.
    const merged = normalizePermissions({
      ...normalizePermissions(target.permissions),
      ...value,
    });

    const updated = await updateUser(req.organizationId, target.id, { permissions: merged });

    // Diffed per resource rather than storing two permission blobs, because
    // "what exactly changed" is the question. Two blobs would require the reader
    // to hold them side by side and spot the difference themselves.
    await auditUserChange(
      req,
      "permission_change",
      target.id,
      flattenPermissionDiff(target.permissions, merged, target.name),
      target.name,
    );

    res.json(publicUser(updated));
  }),
);

router.post(
  "/users/:id/permissions/reset",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const target = await findUserById(req.organizationId, req.params.id);
    if (!target) throw notFound("User not found");

    if (target.role === "admin") {
      throw conflict("Administrators always have full access, so there is nothing to reset");
    }

    const updated = await updateUser(req.organizationId, target.id, {
      permissions: DEFAULT_PERMISSIONS,
    });

    // Recorded as a change rather than as a special "reset" action: a reset is
    // just a permission diff, and keeping it in the same shape means the audit
    // view needs no separate handling for it.
    await auditUserChange(
      req,
      "permission_change",
      target.id,
      flattenPermissionDiff(target.permissions, DEFAULT_PERMISSIONS),
      target.name,
    );

    res.json(publicUser(updated));
  }),
);

router.delete(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const target = await findUserById(req.organizationId, req.params.id);
    if (!target) throw notFound("User not found");

    if (target.id === req.user.id) {
      throw conflict("You cannot delete your own account");
    }

    if (target.role === "admin") {
      const admins = (await listUsers(req.organizationId)).filter((u) => u.role === "admin");
      if (admins.length <= 1) throw conflict("Cannot delete the last administrator");
    }

    // Their follow-ups become unowned rather than being removed.
    await releaseCreator(req.organizationId, target.id);

    const removed = await deleteUser(req.organizationId, target.id);

    // Written after the delete. This is the entry that has to survive: once the
    // user row is gone, this is the only record that they existed and what they
    // could reach. That is why actor_id on this entry is the *admin's* id and the
    // target is the removed user, rather than the entry disappearing with them.
    await auditUserChange(
      req,
      "permission_change",
      target.id,
      describeDeletion(publicUser(target), ["name", "email", "role", "permissions"]),
      target.name,
    );

    res.json(publicUser(removed));
  }),
);

export default router;
