// Central config so the JWT secret is read in one place and a missing secret
// fails loudly at boot rather than silently signing tokens with "undefined".

// Imported here as well as in server.js so config works no matter which entry
// point loads it first.
import "dotenv/config";

const DEV_SECRET = "dev-only-insecure-secret-change-me";

// Both spellings of the loopback host are listed because they are different
// origins to the browser. Opening the app at 127.0.0.1 instead of localhost
// sends a different Origin header, and a request from the unlisted one is
// blocked with no readable error in the frontend.
const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const secret = process.env.JWT_SECRET;

if (!secret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }

  console.warn(
    "[auth] JWT_SECRET is not set. Using a development-only fallback — set it in backend/.env.",
  );
}

export const config = {
  jwtSecret: secret || DEV_SECRET,
  // Long enough for a normal work session, short enough to limit the damage
  // from a leaked token.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  port: Number(process.env.PORT) || 5000,
  corsOrigin: (process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",
};
