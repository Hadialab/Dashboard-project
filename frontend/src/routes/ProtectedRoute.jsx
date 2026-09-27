import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import useAuthStore from "../store/authStore";
import usePermissions from "../hooks/usePermissions";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

/**
 * Gate for protected routes.
 *
 * Two checks: the session must be valid, and the signed-in user must have
 * access to the section. The `permission` prop is the resource that gates the
 * route; omit it for pages everyone signed in can reach.
 *
 * The API enforces the same rules independently, so this only stops the user
 * landing on a page that would render nothing.
 */
function ProtectedRoute({ children, permission }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isChecking = useAuthStore((state) => state.isChecking);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const { can } = usePermissions();
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

  if (permission && !can(permission, "view")) {
    return <NoAccess />;
  }

  return children;
}

/** Shown when a signed-in user reaches a section they have no access to. */
function NoAccess() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <ShieldAlert size={24} className="text-amber-600 dark:text-amber-400" />
        </div>

        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          No access to this section
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your account does not have permission to view this. Ask an
          administrator if you need it.
        </p>

        <div className="mt-5 flex justify-center">
          <Button onClick={() => window.history.back()}>Go back</Button>
        </div>
      </Card>
    </div>
  );
}

export default ProtectedRoute;
