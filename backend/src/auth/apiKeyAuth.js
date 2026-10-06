import { findLiveApiKey, hashApiKey } from "../db/repos/apiKeys.js";
import { can, normalizePermissions } from "./permissions.js";
import { unauthorized, forbidden } from "../utils/httpError.js";

// Authenticating a machine with an API key.
//
// Sits in front of `requireAuth`, so a request carrying `crm_...` is a script and a
// request carrying a JWT is a person — distinguished by the shape of the credential,
// not by a flag the caller sets.
//
// The key is then turned into a `req.user` shaped like any other, and everything
// downstream is unchanged: the same permission checks, the same org scoping, the
// same audit entries. That is the point. An integration should not be a second,
// weaker path into the data — it should be the same path with a different way of
// proving who it is.
//
// What an API key deliberately cannot do:
//   - reach `/auth`, `/audit` or `/tenant`. Those are about people and about the
//     company itself; a script has no business reading who did what.
//   - act as an admin. A key is scoped by its own scope list, and an admin bypasses
//     scope checks entirely, so a key that could present itself as an admin would
//     have no meaningful scope at all.
//   - write audit entries naming a person. It is attributed to the key's label, so
//     "who changed this" is never answered with a script's name as though it were a
//     colleague's.

/** Paths a key may never reach, whatever its scopes say. */
const FORBIDDEN_PREFIXES = ["/auth", "/audit", "/tenant", "/events"];

/**
 * Express middleware.
 *
 * Only acts on a credential that looks like a key. Anything else falls straight
 * through, so `requireAuth` still handles JWTs and an unauthenticated request still
 * gets the same 401 as before.
 */
export function authenticateApiKey(req, _res, next) {
  const header = req.get("authorization") ?? "";
  const [scheme, credential] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !credential?.startsWith("crm_")) {
    next();
    return;
  }

  // Async because the lookup is. A rejected promise here would be an unhandled
  // rejection that takes the process down, so it is caught and turned into a next().
  findLiveApiKey(hashApiKey(credential))
    .then((key) => {
      if (!key) throw unauthorized("Invalid or revoked API key");

      if (FORBIDDEN_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
        throw forbidden("API keys cannot reach this endpoint");
      }

      req.user = {
        id: null,
        name: `API key ${key.id}`,
        role: "rep",
        // Not admin — see the note above. The scopes list is enforced separately
        // by `canApiKey`, because it is not the same shape as a user's permissions.
        permissions: normalizePermissions({}),
        isApiKey: true,
        apiKeyId: String(key.id),
        apiKeyScopes: key.scopes ?? [],
      };

      req.organizationId = key.organization_id;
      next();
    })
    .catch(next);
}

/**
 * Whether a key's scopes allow this.
 *
 * Separate from the permission system because a key's scopes are flat strings
 * (`deals:write`) rather than a nested permission object, and because a key is
 * never an admin. A route opts in with `requireScope("deals:write")`; a route that
 * does not is reachable by any valid key, which is why the resource routes say so
 * explicitly.
 */
export function requireScope(...scopes) {
  return (req, _res, next) => {
    if (!req.user?.isApiKey) return next();

    const held = new Set(req.user.apiKeyScopes ?? []);

    if (scopes.some((scope) => held.has(scope))) return next();

    next(
      forbidden(
        `This API key does not carry the "${scopes.join("` or `")}" scope. ` +
          `It has: ${[...held].join(", ") || "none"}.`,
      ),
    );
  };
}

/**
 * Whether a key may act on one resource at all.
 *
 * Used by the resource factory, which cannot name a scope per method without the
 * route layer knowing about them. A `write` scope implies `read`: a key that can
 * create a deal can obviously fetch the list it just added to.
 */
export function canApiKey(req, resource, action) {
  if (!req.user?.isApiKey) return true;

  const verb = action === "create" || action === "edit" || action === "delete" ? "write" : "read";
  const scopes = req.user.apiKeyScopes ?? [];

  return scopes.includes(`${resource}:${verb}`) || scopes.includes(`${resource}:write`);
}

export { can };