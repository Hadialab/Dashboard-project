import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // jsdom rather than the default node environment: the integration tests
    // render real components, and several utils touch document/Blob/URL.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: false,
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
});
