import api from "../api/axios";

// Notes are the activity timeline, hung off a customer or a deal.
export async function getNotes({ entityType, entityId }) {
  const response = await api.get("/notes", { params: { entityType, entityId } });
  return response.data;
}

export async function createNote({ entityType, entityId, body }) {
  const response = await api.post("/notes", { entityType, entityId, body });
  return response.data;
}

export async function deleteNote(id) {
  await api.delete(`/notes/${id}`);
}
