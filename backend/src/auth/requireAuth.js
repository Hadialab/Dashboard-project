import { findById } from "../db/store.js";
import { readBearerToken, verifyToken } from "./tokens.js";
import { unauthorized } from "../utils/httpError.js";

// Gate for the data routes. Without a valid token there is no req.user, so a
// request never reaches a handler — this is what stops someone who found the
// API URL from reading or writing CRM data.
export function requireAuth(req, _res, next) {
  const token = readBearerToken(req);
  if (!token) {
    throw unauthorized("Authentication required");
  }

  const payload = verifyToken(token);

  // Re-read the user so a deleted account loses access immediately rather
  // than staying valid until its token expires.
  const user = findById("users", payload.sub);
  if (!user) {
    throw unauthorized("Account no longer exists");
  }

  // Handlers should never be able to accidentally serialize the password hash.
  const { passwordHash, ...safeUser } = user;
  req.user = safeUser;

  next();
}
