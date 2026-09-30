import * as Sentry from "@sentry/react";

import { appEnv, appVersion, isErrorTrackingEnabled, sentryDsn } from "../config";

/**
 * Error tracking, on Sentry's free tier.
 *
 * Off unless VITE_SENTRY_DSN is set, and that is the whole design: a developer
 * running `npm run dev` and a CI run both have no DSN, so neither sends
 * anything anywhere, and neither needs an account to run the app. Turning it on
 * is one environment variable in a deployment.
 *
 * What is deliberately NOT sent:
 *   - request and response bodies, which is where customer records live;
 *   - the Authorization header;
 *   - anything typed into a form.
 * A CRM holds names, emails and phone numbers. An error report that quietly
 * includes a customer's email is a data leak with a friendly dashboard, so the
 * scrubbers below are not optional decoration.
 */

/** Paths that say nothing useful and would only add noise. */
const IGNORED_ERRORS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  // A cancelled navigation is not a fault, and react-router logs them as errors.
  "AbortError",
  "Request aborted",
];

/** Network chatter. The UI already shows a real error state for these. */
const IGNORED_TRANSACTIONS = [/^GET \/(health|auth\/me)$/];

/**
 * Starts error tracking. Safe to call when tracking is off — it becomes a no-op,
 * so nothing in the app has to check first.
 */
export function initErrorTracking(): void {
  if (!sentryDsn) return;

  Sentry.init({
    dsn: sentryDsn,
    environment: appEnv,

    // Enough to find the break, not enough to reconstruct a session. Release
    // tagging is what makes "fixed in the last deploy?" answerable.
    release: appVersion === "unknown" ? undefined : appVersion,
    tracesSampleRate: 0,

    // Strips the request and response bodies, which is where customer records
    // are, and drops the auth header.
    beforeSend(event) {
      // The Sentry type for an event does not model request/response, but both
      // are real and both are where a leaked record would be. Narrowed here
      // rather than with a blanket `any`.
      const withIo = event as unknown as {
        request?: {
          data?: unknown;
          cookies?: unknown;
          headers?: Record<string, unknown>;
        };
        response?: { data?: unknown };
        extra?: Record<string, unknown>;
      };

      if (withIo.request) {
        delete withIo.request.data;
        delete withIo.request.cookies;
        if (withIo.request.headers) {
          delete withIo.request.headers.authorization;
          delete withIo.request.headers.Authorization;
          delete withIo.request.headers.cookie;
        }
      }
      delete withIo.response?.data;
      if (withIo.extra) delete withIo.extra.formData;

      if (event.exception?.values?.[0]?.value && IGNORED_ERRORS.includes(event.exception.values[0].value!)) {
        return null;
      }

      return event;
    },
    ignoreErrors: IGNORED_ERRORS,
    ignoreTransactions: IGNORED_TRANSACTIONS,
  });
}

/** Reports a caught error. A no-op when tracking is off. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!isErrorTrackingEnabled) return;

  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Adds a breadcrumb, so a report shows what the user did just before it broke.
 *
 * Intended for navigation and lifecycle events only — never for anything typed
 * or anything fetched that contains a record.
 */
export function addBreadcrumb(crumb: {
  category?: string;
  message?: string;
  level?: "debug" | "info" | "warning" | "error";
  data?: Record<string, unknown>;
}): void {
  if (!isErrorTrackingEnabled) return;

  Sentry.addBreadcrumb(crumb);
}

/** Sets the signed-in user, so a report can be traced back to a real account. */
export function setTrackingUser(user: { id: string; email?: string } | null): void {
  if (!isErrorTrackingEnabled) return;

  Sentry.setUser(user ? { id: user.id, username: user.email } : null);
}
