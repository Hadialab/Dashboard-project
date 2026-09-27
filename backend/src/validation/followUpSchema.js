// Follow-up scheduling. Separate from notes: a note is a record of something
// that happened, a follow-up is something still to do, with a due date and a
// done state.
//
// The entity list is shared with notes rather than repeated here. A follow-up
// hangs off exactly the same records a note does, and two hand-maintained lists
// would drift — which is how 'lead' ended up rejected by this validator while
// the notes route accepted it.

import { NOTE_ENTITY_TYPES } from "./noteSchema.js";

export const FOLLOWUP_TYPES = ["call", "email", "meeting", "task"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TITLE_MAX = 120;
const DETAILS_MAX = 1000;

export function validateFollowUp(body) {
  const errors = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const entityType = String(body.entityType ?? "");
  const entityId = String(body.entityId ?? "");
  const title = String(body.title ?? "").trim();
  const type = String(body.type ?? "task");
  const dueAt = String(body.dueAt ?? "").trim();
  const details = String(body.details ?? "").trim();

  if (!NOTE_ENTITY_TYPES.includes(entityType)) {
    errors.entityType = `entityType must be one of: ${NOTE_ENTITY_TYPES.join(", ")}`;
  }

  if (!entityId) errors.entityId = "entityId is required";

  if (!title) errors.title = "Title is required";
  else if (title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer`;
  }

  if (!FOLLOWUP_TYPES.includes(type)) {
    errors.type = `type must be one of: ${FOLLOWUP_TYPES.join(", ")}`;
  }

  if (!dueAt) errors.dueAt = "Due date is required";
  else if (!ISO_DATE.test(dueAt)) errors.dueAt = "Use YYYY-MM-DD format";

  if (details.length > DETAILS_MAX) {
    errors.details = `Details must be ${DETAILS_MAX} characters or fewer`;
  }

  return {
    value: { entityType, entityId, title, type, dueAt, details },
    errors,
  };
}

export function validateFollowUpUpdate(body) {
  const errors = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const value = {};

  if (body.status !== undefined) {
    if (!["pending", "done"].includes(body.status)) {
      errors.status = "status must be pending or done";
    } else {
      value.status = body.status;
    }
  }

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) errors.title = "Title cannot be empty";
    else if (title.length > TITLE_MAX) {
      errors.title = `Title must be ${TITLE_MAX} characters or fewer`;
    } else value.title = title;
  }

  if (body.dueAt !== undefined) {
    const dueAt = String(body.dueAt).trim();
    if (!ISO_DATE.test(dueAt)) errors.dueAt = "Use YYYY-MM-DD format";
    else value.dueAt = dueAt;
  }

  if (body.details !== undefined) {
    const details = String(body.details).trim();
    if (details.length > DETAILS_MAX) {
      errors.details = `Details must be ${DETAILS_MAX} characters or fewer`;
    } else value.details = details;
  }

  return { value, errors };
}
