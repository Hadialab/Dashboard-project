import axios from "axios";

import type { ApiErrorBody } from "../types";

/**
 * Turns a failed request into a message worth showing a user.
 *
 * The important case is when there is no response at all. That means the request
 * never reached the API, or the browser blocked the reply — almost always CORS,
 * or the backend not running. Saying "please try again" there is actively
 * misleading, because retrying will never help.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    // No response: the request failed before the API could answer.
    if (!err.response) {
      if (err.code === "ERR_NETWORK") {
        return (
          "Could not reach the API. Make sure the backend is running on port 5000, " +
          "and that you are opening the app via http://localhost:5173 rather than " +
          "127.0.0.1 — the API only accepts requests from localhost."
        );
      }

      return "Could not reach the API. Please check your connection.";
    }

    const body = (err.response.data ?? {}) as ApiErrorBody;

    // `details` means two different things depending on the status, and reading
    // it without checking which is how a 409 sending { customerId: "c041" } ended
    // up rendering the bare text "c041" to the user as the error.
    //
    //   400          — a field -> message map from validation
    //   anything else — a small structured payload, not something to show a user
    //
    // The status is what decides, not the shape of the values: "c041" is a
    // string just as much as "Invalid email address" is.
    if (err.response.status === 400) {
      const fieldMessage = Object.values(body.details ?? {}).find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      );
      if (fieldMessage) return fieldMessage;
    }

    if (body.error) return body.error;

    return `Request failed (${err.response.status}).`;
  }

  return fallback;
}
