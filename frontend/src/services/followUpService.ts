import api from "../api/axios";
import type { FollowUp, NoteEntityType } from "../types";

// Follow-ups are scheduled work attached to a customer, a deal or a lead. Passing
// entityType/entityId scopes to one record; omitting them lists everything the
// signed-in user is allowed to see.

export type FollowUpQuery = {
  entityType?: NoteEntityType;
  entityId?: string;
};

export async function getFollowUps(params: FollowUpQuery = {}): Promise<FollowUp[]> {
  // Strips empty values rather than sending blanks the API would have to guess at.
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );

  const response = await api.get("/followups", { params: clean });
  return response.data;
}

export async function createFollowUp(followUp: Partial<FollowUp>): Promise<FollowUp> {
  const response = await api.post("/followups", followUp);
  return response.data;
}

/** PATCH, not PUT: a follow-up is usually completed or rescheduled in isolation. */
export async function updateFollowUp(id: string, changes: Partial<FollowUp>): Promise<FollowUp> {
  const response = await api.patch(`/followups/${id}`, changes);
  return response.data;
}

export async function deleteFollowUp(id: string): Promise<void> {
  await api.delete(`/followups/${id}`);
}

/** What /notify answers. With no provider configured, `sent` is false. */
export type NotifyResult = {
  sent: boolean;
  reason?: string;
  /** A ready-made mailto:, so the caller can fall back and this is never fatal. */
  mailto?: string;
};

/** Asks the server to email the reminder, falling back to a mailto: link. */
export async function notifyFollowUp(id: string): Promise<NotifyResult> {
  const response = await api.post(`/followups/${id}/notify`);
  return response.data;
}
