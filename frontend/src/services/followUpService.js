import api from "../api/axios";

// Follow-ups are scheduled work attached to a customer or a deal. Passing
// entityType/entityId scopes to one record; omitting them lists everything the
// signed-in user is allowed to see.
export async function getFollowUps(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );

  const response = await api.get("/followups", { params: clean });
  return response.data;
}

export async function createFollowUp(followUp) {
  const response = await api.post("/followups", followUp);
  return response.data;
}

export async function updateFollowUp(id, changes) {
  const response = await api.patch(`/followups/${id}`, changes);
  return response.data;
}

export async function deleteFollowUp(id) {
  await api.delete(`/followups/${id}`);
}

// Asks the server to email the reminder. Returns { sent, reason, mailto }.
// With no provider configured the server reports sent: false and the caller
// falls back to the mailto: link, so this is never a hard failure.
export async function notifyFollowUp(id) {
  const response = await api.post(`/followups/${id}/notify`);
  return response.data;
}
