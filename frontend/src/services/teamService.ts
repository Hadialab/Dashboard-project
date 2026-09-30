import api from "../api/axios";
import type { Permissions, User, UserRole } from "../types";

// Admin-only team management. These endpoints 403 for anyone in Sales, so the
// UI hides them as well rather than relying on the server alone.

export async function listUsers(): Promise<User[]> {
  const response = await api.get("/auth/users");
  return response.data;
}

export async function createUser({
  name,
  email,
  password,
  role,
}: {
  name: string;
  email: string;
  password: string;
  role: UserRole | string;
}): Promise<User> {
  const response = await api.post("/auth/users", { name, email, password, role });
  return response.data;
}

export async function updateUserRole(id: string, role: UserRole | string): Promise<User> {
  const response = await api.patch(`/auth/users/${id}/role`, { role });
  return response.data;
}

/**
 * Sets what a Sales user can see and do. A partial object merges over their
 * current access, so only the keys sent actually change.
 */
export async function updateUserPermissions(
  id: string,
  permissions: Partial<Permissions>,
): Promise<User> {
  const response = await api.patch(`/auth/users/${id}/permissions`, { permissions });
  return response.data;
}

export async function resetUserPermissions(id: string): Promise<User> {
  const response = await api.post(`/auth/users/${id}/permissions/reset`);
  return response.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/auth/users/${id}`);
}
