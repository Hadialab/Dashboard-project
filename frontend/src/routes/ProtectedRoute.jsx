import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

function ProtectedRoute({ children }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isChecking = useAuthStore((state) => state.isChecking);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const location = useLocation();

  // Verify the stored token on first mount. Also listens for the 401 event the
  // axios interceptor fires, so an expired session drops straight to /login.
  useEffect(() => {
    restoreSession();

    const onUnauthorized = () => useAuthStore.getState().logout();
    window.addEventListener("crm:unauthorized", onUnauthorized);

    return () => window.removeEventListener("crm:unauthorized", onUnauthorized);
  }, [restoreSession]);

  // Wait for the check to finish, otherwise a valid session would be
  // redirected to /login on every page refresh.
  if (isChecking) return null;

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
