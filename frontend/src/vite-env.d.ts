/// <reference types="vite/client" />

/**
 * Makes `import.meta.env` typed.
 *
 * Without this, `import.meta.env.VITE_API_URL` is an error in every file that
 * reads configuration, which is how a whole codebase ends up with `any` sprinkled
 * around the places that matter most. The types come from Vite itself, so a
 * typo in a variable name is caught rather than silently undefined.
 */

interface ImportMetaEnv {
  /** Base URL of the API. Inlined at BUILD time, not read at runtime. */
  readonly VITE_API_URL?: string;
  /** Request timeout in milliseconds. */
  readonly VITE_API_TIMEOUT?: string;
  /** Sentry DSN. Unset means error tracking stays off — see Phase 4. */
  readonly VITE_SENTRY_DSN?: string;
  /** Which environment this bundle is, for banners and error reporting. */
  readonly VITE_APP_ENV?: "development" | "staging" | "production" | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
