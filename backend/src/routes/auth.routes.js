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
  updateUser,
} from "../db/repos/users.js";
import { releaseCreator } from "../db/repos/activity.js";
import { signToken } from "../auth/tokens.js";
import { requireAuth } from "../auth/requireAuth.js";
import { ROLES, requireRole } from "../auth/roles.js";
import {
  DEFAULT_PERMISSIONS,
  normalizePermissions,
  UNRESTRICTED_PERMISSIONS,
  validatePermissions,
} from "../auth/permissions.js";
import { validateLogin, validateNewUser, validateRegistration } from "../validation/userSchema.js";
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

    res.json(publicUser(await updateUser(req.organizationId, target.id, { role })));
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

    res.json(
      publicUser(await updateUser(req.organizationId, target.id, { permissions: merged })),
    );
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

    res.json(
      publicUser(
        await updateUser(req.organizationId, target.id, { permissions: DEFAULT_PERMISSIONS }),
      ),
    );
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

    res.json(publicUser(await deleteUser(req.organizationId, target.id)));
  }),
);

export default router;
