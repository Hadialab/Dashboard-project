import axios from "axios";

// Vite exposes VITE_* variables here. The default targets the local backend;
// override it in a .env file when pointing at a deployed API.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
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

// A 401 means the token is missing, expired or revoked. Clear it so the app
// falls back to the login screen instead of looping on failed requests.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/")) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("crm:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export default api;
