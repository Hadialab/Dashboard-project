// Notes are the activity timeline. One collection backs customers, deals and
// leads, discriminated by `entityType` + `entityId`, so the timeline UI is the
// same component in all three places and a note can never be attached to a
// record that does not exist.

export const NOTE_ENTITY_TYPES = ["customer", "deal", "lead"];

// A note is either something a person typed, or an event the server wrote when
// the record was created or a tracked field changed. Events are history, so they
// are not editable or deletable from the UI.
export const NOTE_KINDS = ["note", "event"];

export const NOTE_MAX_LENGTH = 2000;

// Entities a note may hang off, mapped to the store collection and the visibility
// rule for that collection. Kept here so the notes and follow-ups routers do not
// need to import the whole resource config.
const ENTITIES = {
  customer: { collection: "customers", label: (row) => row.name },
  deal: { collection: "deals", label: (row) => row.title },
  lead: { collection: "leads", label: (row) => row.name },
};

export function isValidEntityType(value) {
  return NOTE_ENTITY_TYPES.includes(value);
}

export function entityConfig(entityType) {
  return ENTITIES[entityType] ?? null;
}

export function entityLabel(entityType, row) {
  return ENTITIES[entityType]?.label(row) ?? "";
}

export function validateNote(body) {
  const errors = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const entityType = String(body.entityType ?? "");
  const entityId = String(body.entityId ?? "");
  const body_ = String(body.body ?? "").trim();

  if (!NOTE_ENTITY_TYPES.includes(entityType)) {
    errors.entityType = `entityType must be one of: ${NOTE_ENTITY_TYPES.join(", ")}`;
  }

  if (!entityId) errors.entityId = "entityId is required";
  if (!body_) errors.body = "Note cannot be empty";
  else if (body_.length > NOTE_MAX_LENGTH) {
    errors.body = `Note must be ${NOTE_MAX_LENGTH} characters or fewer`;
  }

  return {
    value: { entityType, entityId, body: body_ },
    errors,
  };
}

/**
 * The sentence the server writes into a record's timeline when a tracked field
 * changes. Returning null means nothing worth recording changed, so no empty
 * entry is written.
 */
export function describeChange(field, from, to) {
  if (from === to) return null;

  // An owner cleared by an admin reads better as "Unassigned" than as blank.
  const readable = (value) => (value === null || value === undefined || value === "" ? "none" : value);

  switch (field) {
    case "stage":
      return `Stage changed from ${readable(from)} to ${readable(to)}`;
    case "status":
      return `Status changed from ${readable(from)} to ${readable(to)}`;
    case "assignedRep":
      return `Assigned rep changed from ${readable(from)} to ${readable(to)}`;
    case "owner":
      return `Owner changed from ${readable(from)} to ${readable(to)}`;
    case "value":
      return `Value changed to $${Number(to ?? 0).toLocaleString()}`;
    case "expectedClose":
      return `Expected close moved to ${readable(to)}`;
    case "customer":
      return `Customer set to ${readable(to)}`;
    default:
      return `${field} changed to ${readable(to)}`;
  }
}
