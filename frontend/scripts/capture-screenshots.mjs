/**
 * Regenerates the README screenshots.
 *
 * A wrapper rather than an inline env var because `FOO=1 cmd` is not valid on
 * Windows cmd, and adding a dependency like cross-env for one variable is worse
 * than a five-line file. Setting it here also means `npm run screenshots` works
 * the same on every machine, which is the point of having a script.
 *
 * The spec itself lives in e2e/screenshots.spec.js and skips unless the flag is
 * set, so a normal `npm run test:e2e` stays free of side effects.
 */
process.env.CAPTURE_SCREENSHOTS = "1";

const { spawnSync } = await import("node:child_process");

const result = spawnSync("npx", ["playwright", "test", "e2e/screenshots.spec.js"], {
  stdio: "inherit",
  // shell:true because npx is a .cmd on Windows, which spawn cannot exec
  // directly.
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
