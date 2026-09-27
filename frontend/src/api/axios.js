import axios from "axios";

// Vite exposes VITE_* variables here. The default targets the local backend;
// override it in a .env file when pointing at a deployed API.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  // Generous, because a free-tier host can take 30-50s to wake from idle.
  timeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 60000),
});

// Where the session token lives. Kept in one place so switching to an httpOnly
// cookie is a change to this file plus the dev server proxy.
export const TOKEN_KEY = "crm_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Attaches the bearer token to every request. Without this the API answers 401,
// which is what protects the data from anyone who only knows the base URL.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retries a request that failed because the connection dropped or timed out.
//
// This is aimed at cold starts: a free-tier host that has spun down refuses or
// drops the first request while it boots, and the retry lands once it is warm.
// Only idempotent methods are retried — replaying a POST could create a
// duplicate record.
const RETRYABLE_METHODS = new Set(["get", "head", "options"]);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A network error (no response at all) or a gateway-level failure from a host
// that is still starting up.
function isTransient(error) {
  if (axios.isAxiosError(error) && !error.response) return true;

  const status = error.response?.status;
  return status === 408 || status === 429 || status >= 502;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config ?? {};

    if (isTransient(error) && RETRYABLE_METHODS.has(config.method ?? "get")) {
      config.retries = (config.retries ?? 0) + 1;

      if (config.retries <= MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * config.retries);
        return api.request(config);
      }
    }

    // A 401 means the token is missing, expired or revoked. Clear it so the app
    // falls back to the login screen instead of looping on failed requests.
    if (error.response?.status === 401 && !config.url?.includes("/auth/")) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("crm:unauthorized"));
    }

    return Promise.reject(error);
  },
);

export default api;
