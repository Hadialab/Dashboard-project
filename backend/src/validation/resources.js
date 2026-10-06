// Lightweight validation mirroring the Yup schemas the frontend already
// enforces, so bad data is rejected at the API too. The frontend remains the
// primary source of user-facing messages; these guard the data.
//
// Each resource also declares its permission name, which is how a sales rep's
// access is looked up in `auth/permissions.js`:
//   permissionName — key in the user's permissions object
//   owned         — whether records have an owner, so "own" scope means anything
//
// Admins bypass all of it.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9\s\-()]{7,20}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Fields whose movement is worth a line in the record's activity timeline.
//
// Declared here rather than in each page because the server sees the before and
// after of every write. Doing it in the page would mean the entry could be
// forgotten by a new caller — the pipeline board, a CSV import, a future
// integration — or could describe a change that was then rolled back.
const TIMELINE = {
  customers: ["status"],
  leads: ["status", "assignedRep"],
  deals: ["stage", "owner", "value", "expectedClose"],
};

// The field that reads as "which record was this".
//
// Declared per resource rather than guessed, because the two disagree: a customer
// and a lead are named `name`, a deal is named `title`. Guessing would label half
// the log with an empty string, which is worse than showing the id alone.
//
// Used to denormalise a label onto each audit row, so the log is readable without
// looking every record up — and stays readable for a record that has since been
// deleted, which is the case an audit log is most often consulted for.
const LABEL_FIELD = {
  customers: "name",
  leads: "name",
  deals: "title",
};

export const resources = {
  customers: {
    prefix: "c",
    permissionName: "customers",
    // Singular name the notes and follow-ups tables key on.
    entityType: "customer",
    owned: false,
    labelField: LABEL_FIELD.customers,
    fields: ["name", "company", "email", "phone", "status"],
    searchFields: ["name", "company", "email", "phone"],
    // `status` drives the Customers toolbar filter.
    required: ["name", "company", "email", "phone", "status"],
    check: (row, errors) => {
      if (isPresent(row, "email") && !EMAIL.test(String(row.email))) {
        errors.email = "Invalid email address";
      }
      if (isPresent(row, "phone") && !PHONE.test(String(row.phone))) {
        errors.phone = "Enter a valid phone number";
      }
    },
    // The frontend omits the id when creating and sends the whole row on update.
    sanitize: (body) => pick(body, ["name", "company", "email", "phone", "status"]),
  },

  deals: {
    prefix: "d",
    permissionName: "deals",
    entityType: "deal",
    owned: true,
    labelField: LABEL_FIELD.deals,
    fields: ["title", "customer", "owner", "ownerId", "stage", "value", "createdDate", "expectedClose"],
    searchFields: ["title", "customer", "owner"],
    // `owner` is excluded: it is the display name of `ownerId`, which the
    // server always sets. Requiring it would reject a perfectly valid request
    // just because the browser left it out.
    required: ["title", "customer", "stage", "value", "expectedClose"],
    check: (row, errors) => {
      if (isPresent(row, "value") && !Number.isFinite(Number(row.value))) {
        errors.value = "Value must be a number";
      }
      if (isPresent(row, "expectedClose") && !ISO_DATE.test(String(row.expectedClose))) {
        errors.expectedClose = "Use YYYY-MM-DD format";
      }
    },
    // `createdDate`, `ownerId` and `owner` are server-assigned; see
    // applyOwnership in routes/factory.js.
    sanitize: (body) => pick(body, ["title", "customer", "stage", "value", "expectedClose"]),
    ownerField: "ownerId",
    ownerLabelField: "owner",
  },

  leads: {
    prefix: "l",
    permissionName: "leads",
    entityType: "lead",
    owned: true,
    labelField: LABEL_FIELD.leads,
    fields: ["name", "company", "email", "phone", "status", "source", "assignedRep", "ownerId", "createdDate"],
    searchFields: ["name", "company", "email", "assignedRep"],
    // `assignedRep` is excluded for the same reason as a deal's `owner`.
    required: ["name", "company", "email", "phone", "status", "source"],
    check: (row, errors) => {
      if (isPresent(row, "email") && !EMAIL.test(String(row.email))) {
        errors.email = "Invalid email address";
      }
      if (isPresent(row, "phone") && !PHONE.test(String(row.phone))) {
        errors.phone = "Invalid phone number";
      }
    },
    // `createdDate`, `ownerId` and `assignedRep` are server-assigned.
    sanitize: (body) => pick(body, ["name", "company", "email", "phone", "status", "source"]),
    ownerField: "ownerId",
    ownerLabelField: "assignedRep",
  },
};

function pick(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

// Whether a field was actually supplied with something in it. A `check` rule must
// skip absent fields: PUT here is a full replacement, so a missing field is a
// "is required" problem, and reporting it a second time as "Invalid email
// address" sends the caller hunting for a malformed value they never sent.
const isPresent = (value, field) => {
  const raw = value[field];
  return raw !== undefined && raw !== null && String(raw).trim() !== "";
};

function validate(config, body, { partial }) {
  const errors = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const value = config.sanitize(body);

  for (const field of config.required) {
    if (!partial && !isPresent(value, field)) {
      errors[field] = `${field} is required`;
    }
  }

  config.check(value, errors);

  // `value` arrives as a string from the deal modal's number input.
  if (value.value !== undefined) value.value = Number(value.value);

  return { value, errors };
}

export { validate, TIMELINE };
