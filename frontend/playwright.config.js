import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

import { resolveE2eDatabaseUrl as resolveE2eDatabaseUrlShared } from "./e2e/e2eDatabase.js";

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
 * Lives in e2e/e2eDatabase.js so the specs open their connection to the same
 * database this config starts the API against.
 */
function resolveE2eDatabaseUrl() {
  return resolveE2eDatabaseUrlShared();
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
      //
      // Spawned directly, with no wrapper. A wrapper was tried — one that teed
      // stdout to a file, on the theory that the server's output is discarded —
      // and it was reverted because it leaked the API process on Windows: killing
      // the wrapper does not kill its child, so the server survived the run and
      // held port 5001, breaking the next one. Playwright already forwards
      // webServer output to the console prefixed `[WebServer]`, so the reason for
      // a failed start is visible without any of that.
      command: "node src/server.js",
      url: `${API_URL}/health`,
      // Never reused. This instance is pointed at the E2E database with an
      // E2E-only CORS allow-list, so reusing a development server would test the
      // wrong configuration entirely.
      reuseExistingServer: false,
      timeout: 60_000,
      cwd: BACKEND_DIR,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        PORT: API_PORT,
        // The API's CORS_ORIGIN is an allow-list, and the development value
        // covers localhost:5173 only. Pointing the preview at any other port
        // without this would leave every request blocked with nothing visible in
        // the UI: the page renders and every list stays empty.
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
        DATABASE_URL: resolveE2eDatabaseUrl() ?? process.env.DATABASE_URL,
        JWT_SECRET: process.env.E2E_JWT_SECRET ?? "e2e-secret-never-used-in-production",
        // The origin the emailed reset link is built from, pointing at this run's
        // preview server. Without it the link would point at the developer's dev
        // server on 5173 — which works locally and sends CI users to a page that is
        // not being served, so the flow passes locally and fails there.
        APP_URL: BASE_URL,
        // No EMAIL_API_KEY, deliberately: the suite must not send real mail. The
        // provider being unconfigured is a state the app has to handle anyway, and
        // the E2E reset test reads the token out of the database instead of an
        // inbox — so the test does not depend on a provider being available.
        EMAIL_API_KEY: "",
        EMAIL_FROM: "",
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
