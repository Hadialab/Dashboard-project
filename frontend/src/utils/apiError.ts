import axios from "axios";

import type { ApiErrorBody } from "../types";

/**
 * Every failure in the app, in one shape.
 *
 * The alternative is what the app had: each component catching its own error and
 * inventing a message. Two components reading the same 403 produced two
 * different sentences, and nothing could be reasoned about centrally. This is the
 * single normalised form, so a caller can branch on `kind` instead of sniffing
 * at a string.
 */
export type AppErrorKind =
  /** The request never reached the API. Retrying will not help. */
  | "network"
  /** The API answered, and said no. */
  | "api"
  /** 401. The session is gone. */
  | "auth"
  /** 403. Signed in, but not allowed. */
  | "forbidden"
  /** 409. The request conflicts with the current state. */
  | "conflict"
  /** 400 with per-field messages, keyed by field name. */
  | "validation"
  /** 5xx, or a gateway failure on the way to the app. */
  | "server"
  /** Not an API failure at all — a bug in the browser, or a rejected promise. */
  | "unknown";

export type AppError = {
  kind: AppErrorKind;
  /** Safe to show a user. Never a stack trace, never a raw object. */
  message: string;
  /** The HTTP status, when there was a response. */
  status?: number;
  /** Per-field messages, present only for a validation failure. */
  fieldErrors?: Record<string, string>;
  /** Whether trying the same request again could plausibly succeed. */
  retryable: boolean;
  /** The original throwable, for logging. Never rendered. */
  original: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Pulls per-field messages out of a validation body, ignoring anything else. */
function readFieldErrors(details: unknown): Record<string, string> | undefined {
  if (!isRecord(details)) return undefined;

  const fields: Record<string, string> = {};
  for (const [field, message] of Object.entries(details)) {
    if (typeof message === "string" && message.trim()) fields[field] = message;
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

function kindFor(status: number, hasFieldErrors: boolean): AppErrorKind {
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 409) return "conflict";
  if (status === 400 || hasFieldErrors) return "validation";
  if (status >= 500 || status === 408 || status === 429 || status === 502) return "server";
  return "api";
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Turns anything thrown into an AppError.
 *
 * The `fallback` is what to say when the throwable carries nothing useful — a
 * component knows better than this module what its own failure meant.
 */
export function normalizeError(err: unknown, fallback = "Something went wrong."): AppError {
  // Already normalised. Idempotent, so a caller can normalise defensively.
  if (isRecord(err) && typeof (err as AppError).kind === "string" && "original" in err) {
    return err as AppError;
  }

  if (!axios.isAxiosError(err)) {
    return { kind: "unknown", message: fallback, retryable: false, original: err };
  }

  // No response at all: the request never arrived, or the reply was blocked.
  if (!err.response) {
    const isNetwork = err.code === "ERR_NETWORK";

    return {
      kind: "network",
      message: isNetwork
      ? "Could not reach the API. Make sure the backend is running, and that this " +
        "page is served from an origin the API allows."
      : "Could not reach the API. Please check your connection.",
      // Deliberately not retryable. A connection that did not happen will not
      // succeed on a second identical attempt, and telling someone to retry is
      // how they end up clicking through a wall of failures.
      retryable: false,
      original: err,
    };
  }

  const status = err.response.status;
  const body = (err.response.data ?? {}) as ApiErrorBody;

  // `details` means two different things depending on the status, and reading it
  // without checking which is how a 409 sending { customerId: "c041" } ended up
  // rendering a bare "c041" as the error message.
  //
  //   400          — a field -> message map from validation
  //   anything else — a small structured payload, not something to show a user
  //
  // The status decides, not the shape of the values: "c041" is a string just as
  // much as "Invalid email address" is.
  const fieldErrors = status === 400 ? readFieldErrors(body.details) : undefined;

  return {
    kind: kindFor(status, Boolean(fieldErrors)),
    status,
    // A field message is the most specific thing available, so it wins. Only a
    // 400 carries one: a 409 sending { customerId } would otherwise render a bare
    // "c041" as the error message, which is how that once reached a user.
    message:
      (fieldErrors && Object.values(fieldErrors)[0]) ||
      body.error ||
      `Request failed (${status}).`,
    fieldErrors,
    retryable: RETRYABLE_STATUSES.has(status),
    original: err,
  };
}

/**
 * The message to show a user.
 *
 * A thin wrapper over normalizeError, for the many call sites that only want the
 * sentence and have no reason to care about the rest of the shape.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  return normalizeError(err, fallback).message;
}

/** True when this is an auth failure and the session should be dropped. */
export function isAuthError(err: unknown): boolean {
  return normalizeError(err).kind === "auth";
}
