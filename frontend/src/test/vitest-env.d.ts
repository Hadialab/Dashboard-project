/// <reference types="vitest/globals" />

// The jest-dom matchers, typed.
//
// `src/test/setup.js` imports `@testing-library/jest-dom/vitest` at runtime, which
// registers `toBeInTheDocument`, `toHaveAttribute` and the rest on `expect`. But
// that file is plain JavaScript, and `allowJs` is now false — so the type checker
// never sees the import, and every test using a matcher is an error rather than a
// pass.
//
// This is the type-only half of the same registration: it tells TypeScript what
// the runtime already provides. Nothing here executes.
//
// Kept in its own file rather than added to setup.js because a .js file is exactly
// what the type checker is no longer reading. It is listed explicitly in
// tsconfig.testcheck.json's `include` for the same reason as vite-env.d.ts: an
// explicit include beats a glob that might miss a .d.ts.

import "@testing-library/jest-dom/vitest";