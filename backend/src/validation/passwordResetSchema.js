import { checkPassword } from "./userSchema.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What a token looks like: 64 hex characters, which is what `generateResetToken`
 * produces.
 *
 * Exported so the route can shape-check before spending a database round trip,
 * without the two places disagreeing about the rule.
 */
export const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

/**
 * `POST /auth/forgot-password`.
 *
 * Only the shape of the address is checked, never whether it exists — the route
 * answers identically either way, and anything that looked it up here would be a
 * second place to get that wrong.
 */
export function validateForgotPassword(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const errors = {};

  if (!EMAIL.test(email)) errors.email = "Enter a valid email address";

  return { value: { email }, errors };
}

/**
 * `POST /auth/reset-password`.
 *
 * The token is deliberately *not* validated here.
 *
 * That looks like an oversight and is the opposite: returning a field error for a
 * malformed token, while an unknown-but-well-formed one gets a different message
 * from the route, turns this endpoint into an oracle for which 64-character
 * strings were ever issued as reset tokens. The route handles the token in one
 * place — shape check and lookup together, one rejection message for both — so the
 * distinction cannot be observed from outside.
 *
 * The password is still validated, because a password problem is the user's own
 * input and telling them about it leaks nothing.
 */
export function validateResetPassword(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const password = String(body.password ?? "");
  const errors = {};

  // The same policy as registration, so a user cannot reset to something they
  // could not have registered with.
  const passwordProblem = checkPassword(password);
  if (passwordProblem) errors.password = passwordProblem;

  return { value: { token: String(body.token ?? "").trim(), password }, errors };
}