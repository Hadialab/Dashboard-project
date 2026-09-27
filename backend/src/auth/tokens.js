import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { unauthorized } from "../utils/httpError.js";

export function signToken(user) {
  return jwt.sign(
    // Only the id goes in the payload. Name and email are re-read from the
    // store on each request so a profile change is reflected immediately
    // rather than waiting for the token to expire.
    { sub: String(user.id) },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

// Accepts the token from the Authorization header. Kept separate from the
// route guard so the parsing rules live in one place.
export function readBearerToken(req) {
  const header = req.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (!token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

// Throws 401 on anything unusable, so callers can just try/catch.
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw unauthorized("Session expired, please sign in again");
    }
    throw unauthorized("Invalid authentication token");
  }
}
