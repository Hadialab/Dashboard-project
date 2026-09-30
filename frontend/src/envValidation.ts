/**
 * Configuration rules, with no dependency on `import.meta.env`.
 *
 * The important detail is what this module does NOT import: it takes the
 * environment as an argument instead of reading it. That is what lets the same
 * rules run in two places —
 *
 *   - at BUILD time, from a Vite plugin, where a failure fails the build;
 *   - in the BROWSER, from src/config.ts, as a last-resort safety net.
 *
 * The first version of this validation lived only in the browser bundle. It
 * looked correct and passed review, and it caught nothing: Vite compiles the
 * bundle without executing it, so a throw at module scope only happened when a
 * real user loaded the page. A build that ships a broken configuration is the
 * exact failure this was meant to prevent, so the rules have to be callable
 * from the build.
 */

/**
 * The values Vite exposes. `boolean` is in the union because Vite injects real
 * booleans for DEV/PROD/SSR, so a caller passing `import.meta.env` straight
 * through is the expected case, not a mistake to guard against.
 */
export type EnvLike = Record<string, string | boolean | undefined>;

/** Trimmed, as a string. An absent variable is "", never `undefined` downstream. */
function text(env: EnvLike, key: string): string {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
}

export type EnvProblem = {
  /** The variable at fault. */
  variable: string;
  /** What is wrong, in one sentence. */
  problem: string;
  /** What to do about it. */
  fix: string;
};

/**
 * Hosts from the committed .env files. A build that still points at one of these
 * reaches nobody, so a publish build is refused.
 */
const PLACEHOLDER_HOSTS = ["example.com", "example.org", "your-api-host"];

/** Accepted as "the API lives on the same host, behind a proxy". */
function isRelativePath(value: string): boolean {
  return value.startsWith("/");
}

/**
 * Checks a set of environment values.
 *
 * `isDeploy` is passed in rather than inferred, because it is the caller's call:
 * a developer running `npm run build` locally is checking that the production
 * bundle compiles, and being blocked by a placeholder URL would only teach them
 * to bypass the check. A build that gets published has no such excuse.
 *
 * Returns the problems found. An empty array means the configuration is usable.
 */
export function findEnvProblems(env: EnvLike, isDeploy: boolean): EnvProblem[] {
  const problems: EnvProblem[] = [];

  const raw = text(env, "VITE_API_URL");

  if (!raw) {
    problems.push({
      variable: "VITE_API_URL",
      problem: "is not set, so the app would have no API to talk to",
      fix: "Set it in the environment, or in frontend/.env.<mode>",
    });
    return problems; // Nothing else can be judged without a URL.
  }

  if (!isRelativePath(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      problems.push({
        variable: "VITE_API_URL",
        problem: `is set but is not a valid URL: "${raw}"`,
        fix: 'Use an absolute URL such as https://api.example.org, or a path starting with "/"',
      });
      return problems;
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      problems.push({
        variable: "VITE_API_URL",
        problem: `uses the scheme "${url.protocol}", which a browser cannot fetch over`,
        fix: "Use https:// in a deployed build, or a relative path to go through a proxy",
      });
    }

    if (isDeploy) {
      if (url.protocol !== "https:") {
        problems.push({
          variable: "VITE_API_URL",
          problem: `does not use https in a published build: "${raw}"`,
          fix: "Use https://, or serve the API behind the same host as the app",
        });
      }

      if (PLACEHOLDER_HOSTS.some((placeholder) => url.hostname.endsWith(placeholder))) {
        problems.push({
          variable: "VITE_API_URL",
          problem: `still points at the placeholder host "${url.hostname}"`,
          fix: "Set the real API URL in the deployment environment before building",
        });
      }
    }
  }

  const timeout = text(env, "VITE_API_TIMEOUT");
  if (timeout) {
    const parsed = Number(timeout);
    // NaN, zero and negatives all mean "no timeout" or "instant timeout", and
    // both produce an app that either hangs forever or fails every request.
    if (!Number.isFinite(parsed) || parsed <= 0) {
      problems.push({
        variable: "VITE_API_TIMEOUT",
        problem: `is "${timeout}", which is not a usable number of milliseconds`,
        fix: "Set a positive integer, such as 60000",
      });
    }
  }

  const dsn = text(env, "VITE_SENTRY_DSN");
  if (dsn && !/^https:\/\//.test(dsn)) {
    // Sentry SDKs accept a bare key, but a bare key over http is a payload of
    // stack traces and user identifiers in the clear.
    problems.push({
      variable: "VITE_SENTRY_DSN",
      problem: 'is set but is not an https URL',
      fix: "Copy the full DSN from Sentry, which starts https://",
    });
  }

  return problems;
}

/** One block of text, so a build failure says everything wrong at once. */
export function describeEnvProblems(problems: EnvProblem[], mode: string): string {
  const lines = problems.map((p) => `  - ${p.variable} ${p.problem}\n      Fix: ${p.fix}`);

  return [
    `Cannot build the frontend for "${mode}": the configuration is not usable.`,
    "",
    ...lines,
    "",
    problems.length === 1
      ? "Nothing was written to dist. Fix the variable above and build again."
      : "Nothing was written to dist. Fix the variables above and build again.",
  ].join("\n");
}
