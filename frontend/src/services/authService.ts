import api from "../api/axios";
import type {
  AuthResponse,
  MeResponse,
  User,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from "../types";

// Auth calls go through the same axios instance as the data calls, so the
// Authorization header and 401 handling are shared.

export async function login({ email, password }: LoginRequest): Promise<AuthResponse> {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
}

/**
 * `organizationName` names the company this signup creates. It is passed
 * explicitly rather than spread, so the payload stays obvious about what the
 * API actually receives.
 */
export async function register({
  name,
  organizationName,
  email,
  password,
}: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post("/auth/register", { name, organizationName, email, password });
  return response.data;
}

/**
 * Confirms a stored token is still valid.
 *
 * Returns null when it is not, so the caller can clear the session rather than
 * trusting a stale token. Throwing here would leave a signed-out user staring at
 * a half-initialised app.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await api.get("/auth/me");
    return (response.data as MeResponse).user;
  } catch {
    return null;
  }
}

/**
 * Asks for a reset link.
 *
 * Returns the API's message rather than a boolean, and that is deliberate: the
 * server answers identically whether or not the address is registered, and a
 * client that inferred the answer from a boolean would undo that. There is
 * nothing here to branch on.
 */
export async function requestPasswordReset(email: string): Promise<string> {
  const response = await api.post<{ message: string }>("/auth/forgot-password", { email });
  return response.data.message;
}

/**
 * Spends a reset token and sets a new password.
 *
 * Returns the user rather than a session token, so a caller cannot accidentally
 * sign someone in from a reset link they found. The user goes to the login page
 * and signs in as themselves, which is the behaviour that makes a reset link
 * useless to anyone who intercepted the email without also learning the password
 * they just chose.
 */
export async function resetPassword({ token, password }: ResetPasswordRequest): Promise<User> {
  const response = await api.post<{ user: User }>("/auth/reset-password", { token, password });
  return response.data.user;
}
