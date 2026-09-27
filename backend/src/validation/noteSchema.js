// Notes are the activity timeline. One collection backs both customers and
// deals, discriminated by `entityType` + `entityId`, so the timeline UI is the
// same component in both places and a note can never be attached to a record
// that does not exist.

export const NOTE_ENTITY_TYPES = ["customer", "deal"];

export const NOTE_MAX_LENGTH = 2000;

// Entities a note may hang off, mapped to the store collection and the
// visibility rule for that collection. Kept here so the notes router does not
// need to import the whole resource config.
const ENTITIES = {
  customer: { collection: "customers", label: (row) => row.name },
  deal: { collection: "deals", label: (row) => row.title },
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
