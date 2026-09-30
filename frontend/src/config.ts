/**
 * Every environment-dependent value, read once.
 *
 * Two things this buys, both of which have bitten this app:
 *
 *   1. A typo in a variable name is caught, not silently `undefined`.
 *   2. A build with no API URL, a placeholder URL, or http in production fails
 *      instead of shipping — which is the single worst failure mode a
 *      client-side app has: it works perfectly for whoever built it.
 *
 * The rules themselves live in src/envValidation.ts and are ALSO run by
 * vite.config.js at build time. That module is the one that matters; the checks
 * repeated below are a browser-side safety net for a bundle built without them,
 * and they deliberately reuse the same rules so the two cannot drift.
 *
 * Note the VITE_ prefix means these values are inlined into the bundle and are
 * readable by anyone who opens the app. That is fine for a URL and a DSN. It is
 * never fine for a secret — secrets belong in backend/.env.
 */

import { findEnvProblems } from "./envValidation";

export type AppEnvironment = "development" | "staging" | "production";

type RawEnv = ImportMetaEnv & { DEV?: boolean; MODE?: string; PROD?: boolean };

const env = import.meta.env as RawEnv;

/** The mode Vite actually built with: "development", "test", "staging", "production". */
const mode = env.MODE ?? (env.DEV ? "development" : "production");

/**
 * Vitest runs the config through Vite with mode= "test", where there is no
 * served app and no API to reach. Treated as development throughout: it gets
 * the localhost default and none of the strictness, because a test run is not a
 * deployment and should never fail on a missing URL.
 */
const isTestMode = mode === "test";

/**
 * Where the app came from. `VITE_APP_ENV` overrides, because the build mode and
 * the deployment are not always the same name — a staging build can be served
 * from a preview URL that still calls itself production.
 */
export const appEnv: AppEnvironment = (env.VITE_APP_ENV as AppEnvironment) ?? (mode as AppEnvironment);

export const isDev = appEnv === "development" || isTestMode;
export const isStaging = appEnv === "staging";
export const isProd = appEnv === "production";

/**
 * Set by CI (VITE_DEPLOY=1) on the builds that are actually published.
 *
 * The distinction matters for the validation below: a developer running
 * `npm run build` locally is checking that the production bundle compiles, and
 * failing that on a placeholder URL would only teach them to bypass the check.
 * A build that gets published has no excuse for a placeholder, so only that one
 * is held to it.
 */
export const isDeployBuild = env.VITE_DEPLOY === "1" || env.VITE_DEPLOY === "true";

/**
 * The API base URL, with no silent fallback in a deployed build.
 *
 * Development gets `localhost:5000` because that is genuinely the default and a
 * missing value there is not worth failing over. Anywhere else, a missing value
 * is a deployment mistake, and saying so at build time is far cheaper than
 * discovering it from a support ticket.
 */
function resolveApiUrl(): string {
  // Development gets a real default: that genuinely is where the backend runs,
  // and failing a developer's dev server over a missing value would be a
  // nuisance rather than a safety net.
  const raw = env.VITE_API_URL?.trim() || (isDev ? "http://localhost:5000" : "");

  // Same rules the build used. In practice this is unreachable, because a build
  // that fails these never produced a bundle — which is exactly why it is worth
  // keeping: it covers a bundle built by an older commit, or served from a cache.
  const problems = findEnvProblems(
    { VITE_API_URL: raw, VITE_API_TIMEOUT: env.VITE_API_TIMEOUT },
    isDeployBuild,
  );

  if (problems.length > 0) {
    const first = problems[0]!;
    throw new Error(`VITE_API_URL ${first.problem}. Fix: ${first.fix}`);
  }

  return raw.replace(/\/+$/, ""); // No trailing slash: axios joins paths itself.
}

export const apiUrl = resolveApiUrl();

/**
 * A timeout long enough for a free-tier host to wake from idle, because a cold
 * start that fails is worse than a slow one.
 */
export const apiTimeoutMs = Number(env.VITE_API_TIMEOUT ?? 60_000) || 60_000;

/**
 * The Sentry DSN, or empty when tracking is off.
 *
 * Every call site checks this, so "no DSN configured" is the single switch that
 * turns tracking off. Unset by default, which means development and CI send
 * nothing anywhere and need no account.
 */
export const sentryDsn = env.VITE_SENTRY_DSN?.trim() ?? "";

export const isErrorTrackingEnabled = Boolean(sentryDsn);

/** Set by CI from the commit SHA, so reports can be matched to a release. */
export const appVersion = env.VITE_APP_VERSION ?? "unknown";

/**
 * A short label for the environment, for the navbar and for error reports.
 *
 * Production and staging are told apart on purpose. Treating a staging bug as a
 * production one wastes an afternoon; treating a production bug as staging ships
 * a broken release.
 */
export const envLabel: string | null = isDev ? null : isStaging ? "Staging" : "Production";

/**
 * Everything the app needs to know about its configuration, in one object, for
 * logging or a diagnostics screen. Safe to print — no secret can appear here.
 */
export const config = {
  appEnv,
  mode,
  apiUrl,
  apiTimeoutMs,
  errorTracking: isErrorTrackingEnabled,
  version: appVersion,
} as const;
