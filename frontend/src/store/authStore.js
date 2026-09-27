import { create } from "zustand";
import { TOKEN_KEY, getToken } from "../api/axios";
import { getCurrentUser, login as loginRequest, register as registerRequest } from "../services/authService";

// Session state. `isChecking` is true while the stored token is being verified
// on page load, so ProtectedRoute can wait instead of bouncing a signed-in user
// to /login before the check finishes.
const useAuthStore = create((set) => ({
  isLoggedIn: false,
  user: null,
  isChecking: true,

  // Called once at startup. Verifies the token with the API rather than
  // trusting whatever is in localStorage.
  async restoreSession() {
    if (!getToken()) {
      set({ isLoggedIn: false, user: null, isChecking: false });
      return;
    }

    const user = await getCurrentUser();

    if (user) {
      set({ isLoggedIn: true, user, isChecking: false });
    } else {
      localStorage.removeItem(TOKEN_KEY);
      set({ isLoggedIn: false, user: null, isChecking: false });
    }
  },

  // Throws on bad credentials so the caller can show the API's message.
  async login(credentials) {
    const { token, user } = await loginRequest(credentials);
    localStorage.setItem(TOKEN_KEY, token);
    set({ isLoggedIn: true, user, isChecking: false });
    return user;
  },

  async register(details) {
    const { token, user } = await registerRequest(details);
    localStorage.setItem(TOKEN_KEY, token);
    set({ isLoggedIn: true, user, isChecking: false });
    return user;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    set({ isLoggedIn: false, user: null, isChecking: false });
  },
}));

export default useAuthStore;
