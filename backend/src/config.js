import "dotenv/config";

// Central config so the JWT secret is read in one place and a missing secret
// fails loudly at boot rather than silently signing tokens with "undefined".
//
// dotenv is imported here as well as in server.js so config works no matter
// which entry point loads it first.
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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Copy backend/.env.example to backend/.env");
}

// Where the frontend lives, as the browser sees it.
//
// Needed for password reset, and the failure mode is quiet: a reset link built
// from the wrong origin is still a working, correctly-signed token, so nothing
// errors and nothing is logged. The emailed link simply goes somewhere that is
// not this app, and the user concludes the feature is broken. Required in
// production for the same reason JWT_SECRET is.
const DEFAULT_APP_URL = "http://localhost:5173";

const appUrl = (process.env.APP_URL ?? DEFAULT_APP_URL).replace(/\/+$/, "");

if (!process.env.APP_URL && process.env.NODE_ENV === "production") {
  throw new Error("APP_URL must be set in production — password reset links are built from it");
}

export const config = {
  jwtSecret: secret || DEV_SECRET,
  // Long enough for a normal work session, short enough to limit the damage
  // from a leaked token.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  port: Number(process.env.PORT) || 5000,
  // Trailing slashes stripped, because they compose badly: `${appUrl}/login`
  // against a configured `https://crm.example.com/` produces a doubled slash,
  // which some routers treat as a different path and 404 on.
  appUrl,
  corsOrigin: (process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",

  // PostgreSQL. Holds every tenant's data, so treat the credentials as
  // production secrets.
  databaseUrl: process.env.DATABASE_URL,
  databasePoolSize: Number(process.env.DATABASE_POOL_SIZE) || 10,
  // Run the idempotent schema on boot. Convenient locally; turn it off if you
  // would rather apply migrations yourself.
  runMigrationsOnBoot: process.env.RUN_MIGRATIONS !== "false",
};
