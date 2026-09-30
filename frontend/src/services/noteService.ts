import api from "../api/axios";
import type { Note, NoteEntityType } from "../types";

// Notes are the activity timeline, hung off a customer, a deal or a lead.

export type NoteQuery = {
  entityType: NoteEntityType;
  entityId: string;
};

export async function getNotes({ entityType, entityId }: NoteQuery): Promise<Note[]> {
  const response = await api.get("/notes", { params: { entityType, entityId } });
  return response.data;
}

export async function createNote({
  entityType,
  entityId,
  body,
}: {
  entityType: NoteEntityType;
  entityId: string;
  body: string;
}): Promise<Note> {
  const response = await api.post("/notes", { entityType, entityId, body });
  return response.data;
}

/**
 * Deletes a typed note.
 *
 * A server-written event is not deletable, not even by an admin: it is history,
 * and the API answers 403. That refusal is the point, and is covered by a test.
 */
export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`);
}
