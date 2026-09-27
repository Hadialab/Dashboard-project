import axios from "axios";

/**
 * Turns a failed request into a message worth showing a user.
 *
 * The important case is when there is no response at all. That means the
 * request never reached the API, or the browser blocked the reply — almost
 * always CORS, or the backend not running. Saying "please try again" there is
 * actively misleading, because retrying will never help.
 */
export function getApiErrorMessage(err, fallback) {
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

    // A field-level message from validation, e.g. duplicate email.
    const fieldMessage = Object.values(err.response.data?.details ?? {})[0];
    if (fieldMessage) return fieldMessage;

    if (err.response.data?.error) return err.response.data.error;

    return `Request failed (${err.response.status}).`;
  }

  return fallback;
}
