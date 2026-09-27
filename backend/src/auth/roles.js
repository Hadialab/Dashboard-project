import { unauthorized, forbidden } from "../utils/httpError.js";

// Role checks. `admin` is the only elevated role; every non-admin user is a
// sales rep, which is what the record-level scoping in resources.js expects.
export const ROLES = ["admin", "rep"];

// Accounts created before roles existed have role "user". Treat any
// non-admin value as a rep so they keep working rather than silently matching
// no records at all.
export function normalizeRole(role) {
  return role === "admin" ? "admin" : "rep";
}

export function isAdmin(user) {
  return user?.role === "admin";
}

// Gate for admin-only routes (user management). Must run after requireAuth so
// req.user is populated.
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw unauthorized("Authentication required");

    if (!roles.includes(req.user.role)) {
      throw forbidden("This action requires an administrator");
    }

    next();
  };
}
