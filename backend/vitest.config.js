import { defineConfig } from "vitest/config";

// The API's own tests. Separate from the frontend's suite on purpose: they run in
// a different process, with no jsdom and no browser, against a different set of
// assumptions — and the frontend coverage gate is scoped to its own layers, so
// adding backend tests here does not dilute it.
//
// Node environment, not jsdom: there is nothing to render here, and jsdom would
// be slower for no benefit.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,

    // A dummy DATABASE_URL, so tests that build the app can.
    //
    // config.js throws at module load when this is unset — correctly, because
    // running an API without a database is not something to allow. But the OpenAPI
    // drift guard walks the real Express router, and importing the app means
    // importing config.
    //
    // The pool is lazy and no test here runs a query, so nothing ever connects to
    // this. It is a placeholder that satisfies a deliberate startup check, not a
    // real database: the address does not resolve and never needs to.
    env: {
      DATABASE_URL: "postgresql://unused:unused@localhost:5432/unused",
      JWT_SECRET: "test-secret-not-used-in-production",
    },
    // Only the pure-logic tests, and deliberately not the route or repo layers.
    //
    // Those need a real database and a running app, which is what the frontend's
    // Playwright suite already covers end to end against the whole stack. Testing
    // them again here with a mocked pool would assert that the mocks behave, not
    // that the API does.
    include: ["src/test/**/*.test.js"],
  },
});