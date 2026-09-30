import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/**
 * End-to-end configuration.
 *
 * The suite runs against a real stack — a production build served by `vite
 * preview`, talking to the real Express API and PostgreSQL. Nothing is stubbed,
 * because the journeys worth protecting here are exactly the ones where the
 * wiring is the risk: a drag that must persist, an import that must write real
 * rows, a conversion that must be atomic.
 *
 * That means the E2E run needs a database. Each test registers its own company,
 * so tests are isolated by tenant rather than by cleanup, and the data is
 * disposable.
 */

// Resolved from this file rather than with a relative "..", which is ambiguous
// about what it is relative to and pointed outside the project when the API was
// actually started rather than reused.
const BACKEND_DIR = path.resolve(import.meta.dirname, "..", "backend");

/**
 * Resolves the database the E2E API should use.
 *
 * Prefers an explicit E2E_DATABASE_URL. Otherwise it reuses the credentials from
 * backend/.env and swaps in a separate database, so the E2E run needs no
 * environment setup at all and can never write to the database being developed
 * against.
 */
function resolveE2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;

  let devEnv;
  try {
    devEnv = fs.readFileSync(path.join(BACKEND_DIR, ".env"), "utf8");
  } catch {
    return undefined; // No .env: fall back to DATABASE_URL from the environment.
  }

  const match = devEnv.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (!match) return undefined;

  // Same host, port and credentials; a different database.
  return match[1].trim().replace(/\/[^/?]+(\?|$)/, "/crm_e2e$1");
}

/**
 * Dedicated ports, on purpose.
 *
 * The development stack owns 5000 and 5173. Reusing them here meant the E2E run
 * depended on a server it did not control: a previous run's preview, or a
 * developer closing their window, took the suite down mid-run with a bare
 * ERR_CONNECTION_REFUSED and no useful signal. These ports collide with nothing
 * a developer is likely to be running.
 */
const API_PORT = process.env.E2E_API_PORT ?? "5001";
const WEB_PORT = process.env.E2E_WEB_PORT ?? "5174";

const API_URL = `http://localhost:${API_PORT}`;
const BASE_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Serial by default. Every test creates a company, and the stack they share is
  // a single Postgres instance; running them concurrently buys little and makes
  // a failure much harder to read.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      // Uses the Chrome already installed on the machine rather than a
      // Playwright-managed build, so the suite runs without a ~150MB download
      // step. Set E2E_BROWSER=chromium to use the managed build instead, which
      // is what CI does — CI has no preinstalled Chrome and needs the pinned
      // version anyway.
      name: process.env.E2E_BROWSER === "chromium" ? "chromium" : "system-chrome",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.E2E_BROWSER === "chromium" ? {} : { channel: "chrome" }),
      },
    },
  ],

  webServer: [
    {
      // The API. `reuseExistingServer` keeps a dev server the developer already
      // has running, which matters because ports 5000/5173 belong to them.
      command: "node src/server.js",
      url: `${API_URL}/health`,
      // Never reused. This instance is pointed at the E2E database with an
      // E2E-only CORS allow-list, so reusing a development server would test the
      // wrong configuration entirely.
      reuseExistingServer: false,
      timeout: 60_000,
      cwd: BACKEND_DIR,
      env: {
        PORT: API_PORT,
        // The API's CORS_ORIGIN is an allow-list, and the development value
        // covers localhost:5173 only. Pointing the preview at any other port
        // without this would leave every request blocked with nothing visible in
        // the UI: the page renders and every list stays empty.
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
        DATABASE_URL: resolveE2eDatabaseUrl() ?? process.env.DATABASE_URL,
        JWT_SECRET: process.env.E2E_JWT_SECRET ?? "e2e-secret-never-used-in-production",
        NODE_ENV: "test",
      },
    },
    {
      // A production build, not the dev server, so the E2E run also proves the
      // app builds and boots the way it will in production.
      command: `npm run build && npm run preview -- --port ${WEB_PORT} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        // Vite inlines VITE_ variables at BUILD time, not at runtime. Without
        // this the bundle is hard-coded to the default http://localhost:5000,
        // every request goes to a port nothing is listening on, and the app
        // renders with silently empty lists — indistinguishable from a CORS
        // failure, so it is worth being explicit about.
        VITE_API_URL: API_URL,
      },
    },
  ],
});
