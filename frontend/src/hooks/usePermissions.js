import useAuthStore from "../store/authStore";

/**
 * Whether the signed-in user may do `action` on `resource`.
 *
 * Mirrors the server's check so the UI can hide what would be rejected. The
 * server is still the authority — this only avoids showing controls that would
 * fail.
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.role === "admin";

  function can(resource, action) {
    if (isAdmin) return true;

    const permission = user?.permissions?.[resource];
    if (!permission) return false;

    if (action === "view") {
      return (
        permission.view === true || permission.view === "own" || permission.view === "all"
      );
    }

    return permission[action] === true;
  }

  // True when the user may open this section at all. Admin always may.
  function canViewSection(resource) {
    return can(resource, "view");
  }

  return { can, canViewSection, isAdmin, permissions: user?.permissions, user };
}

export default usePermissions;
