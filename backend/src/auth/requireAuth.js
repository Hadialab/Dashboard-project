import { findUserByIdGlobal } from "../db/repos/users.js";
import { readBearerToken, verifyToken } from "./tokens.js";
import { normalizeRole } from "./roles.js";
import { normalizePermissions } from "./permissions.js";
import { asyncHandler, unauthorized } from "../utils/asyncHandler.js";

// Gate for the data routes. Without a valid token there is no req.user, so a
// request never reaches a handler — this is what stops someone who found the
// API URL from reading or writing CRM data.
//
// Also establishes the tenant. `req.organizationId` comes from the user record,
// never from the request, so a client cannot ask for another company's data by
// changing a header or a query parameter.
//
// Runs *after* `authenticateApiKey`, and yields to it. A request already carrying
// a `req.user` was authenticated by a key, and re-verifying the key as a JWT would
// reject every integration with a 401 — while re-reading the user record would look
// up `sub = null` and find nobody. Skipping is safe because a key cannot set
// `req.user` without having presented a credential that matched a live row.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  if (req.user?.isApiKey) {
    next();
    return;
  }

  const token = readBearerToken(req);
  if (!token) {
    throw unauthorized("Authentication required");
  }

  const payload = verifyToken(token);

  // Re-read the user so a deleted account loses access immediately rather than
  // staying valid until its token expires, and so a role or permission change
  // takes effect on the next request.
  const user = await findUserByIdGlobal(payload.sub);
  if (!user) {
    throw unauthorized("Account no longer exists");
  }

  // Handlers should never be able to accidentally serialize the password hash.
  // Permissions are normalized on every request so a partial or tampered stored
  // value cannot widen access.
  const { password_hash, permissions, ...safeUser } = user;

  req.user = {
    ...safeUser,
    role: normalizeRole(safeUser.role),
    permissions: normalizePermissions(permissions),
  };

  // Every query is scoped by this. Set once, from the database, not the request.
  req.organizationId = user.organization_id;

  next();
});
