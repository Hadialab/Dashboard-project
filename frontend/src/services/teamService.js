import api from "../api/axios";

// Admin-only team management. These endpoints 403 for a sales rep, so the UI
// hides them as well rather than relying on the server alone.
export async function listUsers() {
  const response = await api.get("/auth/users");
  return response.data;
}

export async function createUser({ name, email, password, role }) {
  const response = await api.post("/auth/users", { name, email, password, role });
  return response.data;
}

export async function updateUserRole(id, role) {
  const response = await api.patch(`/auth/users/${id}/role`, { role });
  return response.data;
}

export async function deleteUser(id) {
  await api.delete(`/auth/users/${id}`);
}
