import useAuthStore from "../store/authStore";
import type { PermissionResource, User, ViewScope } from "../types";

/** Everything a component needs to decide what to show. */
export type Permissions = {
  /** Whether the signed-in user may do `action` on `resource`. */
  can: (resource: PermissionResource | string, action: string) => boolean;
  /** True when the user may open this section at all. Admin always may. */
  canViewSection: (resource: PermissionResource | string) => boolean;
  isAdmin: boolean;
  user: User | null;
};

/**
 * Whether the signed-in user may do `action` on `resource`.
 *
 * Mirrors the server's check so the UI can hide what would be rejected. The
 * server is still the authority — this only avoids showing controls that would
 * fail, and a test asserts both halves.
 */
export function usePermissions(): Permissions {
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.role === "admin";

  function can(resource: string, action: string): boolean {
    if (isAdmin) return true;

    const permission = (user?.permissions as Record<string, { view?: ViewScope } & Record<string, unknown>>)?.[
      resource
    ];
    if (!permission) return false;

    if (action === "view") {
      return permission.view === true || permission.view === "own" || permission.view === "all";
    }

    return permission[action] === true;
  }

  // True when the user may open this section at all. Admin always may.
  function canViewSection(resource: string): boolean {
    return can(resource, "view");
  }

  return { can, canViewSection, isAdmin, user };
}

export default usePermissions;
