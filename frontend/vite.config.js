import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { describeEnvProblems, findEnvProblems } from "./src/envValidation";

/**
 * Checks the environment before a build starts.
 *
 * This exists because the first version of the configuration check lived in
 * src/config.ts, inside the browser bundle. It read correctly, type-checked, and
 * caught nothing: Vite compiles that bundle without running it, so a throw at
 * module scope only fired when a real person loaded the page. The build reported
 * success and shipped a broken configuration.
 *
 * Running here means the failure happens before a single file is written to dist,
 * so a bad URL is a red build rather than a broken app discovered in production.
 *
 * It also runs for the dev server, where the cost is one log line and the benefit
 * is catching a typo in .env.local on the next reload rather than an hour later.
 */
function checkEnvironment({ mode, isBuild, isDeploy }) {
  // Vitest loads this config with mode= "test". There is no served app and no
  // API to reach there, and every test mocks the service layer, so a missing
  // URL in that mode is not a problem worth reporting.
  if (mode === "test") return;

  // loadEnv with an empty prefix reads every variable, not just VITE_ ones, so
  // the check sees exactly what Vite will see, including anything set in the
  // shell by CI.
  const env = loadEnv(mode, process.cwd(), "");

  // A published build is held to the strict rules. A local one is not: checking
  // that a production bundle compiles is a legitimate thing to do, and blocking
  // it over a placeholder URL only teaches people to bypass the check.
  const problems = findEnvProblems(env, isDeploy);

  if (problems.length > 0) {
    const message = describeEnvProblems(problems, mode);

    // Thrown, not warned: a warning is a line nobody reads, and this is the whole
    // reason the check exists.
    if (isBuild) throw new Error(message);

    console.warn(`\n[config] ${message.replace(/\n/g, "\n[config] ")}\n`);
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const isBuild = command === "build";

  // CI sets VITE_DEPLOY=1 on the builds it publishes.
  const isDeploy = ["1", "true"].includes(String(process.env.VITE_DEPLOY ?? ""));

  checkEnvironment({ mode, isBuild, isDeploy });

  return {
    plugins: [react(), tailwindcss()],
    test: {
      // jsdom rather than the default node environment: the integration tests
      // render real components, and several utils touch document/Blob/URL.
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.js"],
      css: false,

      // Vitest's default `forks` pool is kept.
      //
      // `threads` was set here while chasing a CI failure that turned out to be a
      // Node version problem — jsdom 30 refuses to load below Node 22.22.2, so
      // every worker died on startup. Switching pool changed the error message
      // without changing the cause, which is a good illustration of why a fix has
      // to be justified by the mechanism and not by whether the symptom moves.
      //
      // Left as a default rather than stated explicitly, since it is Vitest's
      // choice and not something this project depends on.

      // 15s, up from Vitest's 5s default.
      //
      // The integration tests render real components and drive them through
      // user-event, which is genuinely slow — a representative test takes 1-2s on
      // a fast machine. On a 4-core CI runner that lands near or past 5s, and the
      // result is a pile of failures that are pure timing: no assertion fires,
      // every test just reports as timed out.
      //
      // That is a bad failure mode, because it looks like the tests are wrong
      // rather than the budget, and it hides a real regression behind 30 red
      // tests nobody can read. 15s is still tight enough that a genuinely hung
      // test fails, and CI is the place this matters — a timeout tuned on one
      // developer's laptop is not a timeout.
      testTimeout: 15_000,
      hookTimeout: 15_000,

      // Playwright owns the browser; Vitest must not try to use one.
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/e2e/**",
        "**/*.e2e.{js,jsx}",
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        reportsDirectory: "./coverage",
        // The brief asks for meaningful coverage of business logic, not a number
        // earned by covering trivial glue, so thresholds are scoped to the layers
        // where a regression would actually cost something.
        include: [
          "src/services/**",
          "src/utils/**",
          "src/store/**",
          "src/hooks/**",
        ],
        thresholds: {
          // Enforced in CI: a drop below this fails the build.
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
      },
    },
  };
});
