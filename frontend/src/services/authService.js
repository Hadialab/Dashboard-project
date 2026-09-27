import api from "../api/axios";

// Auth calls go through the same axios instance as the data calls, so the
// Authorization header and 401 handling are shared.
export async function login({ email, password }) {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
}

// `organizationName` names the company this signup creates. It is passed
// explicitly rather than spread, so the payload stays obvious about what the
// API actually receives.
export async function register({ name, organizationName, email, password }) {
  const response = await api.post("/auth/register", {
    name,
    organizationName,
    email,
    password,
  });
  return response.data;
}

// Confirms a stored token is still valid. Returns null when it is not, so the
// caller can clear the session rather than trusting a stale token.
export async function getCurrentUser() {
  try {
    const response = await api.get("/auth/me");
    return response.data.user;
  } catch {
    return null;
  }
}
