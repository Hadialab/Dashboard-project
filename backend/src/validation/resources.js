// Lightweight validation mirroring the Yup schemas the frontend already
// enforces, so bad data is rejected at the API too. The frontend remains the
// primary source of user-facing messages; these guard the data.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9\s\-()]{7,20}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const resources = {
  customers: {
    prefix: "c",
    fields: ["name", "company", "email", "phone", "status"],
    searchFields: ["name", "company", "email", "phone"],
    // `status` drives the Customers toolbar filter.
    required: ["name", "company", "email", "phone", "status"],
    check: (row, errors) => {
      if (!EMAIL.test(String(row.email))) errors.email = "Invalid email address";
      if (!PHONE.test(String(row.phone))) errors.phone = "Enter a valid phone number";
    },
    // The frontend omits the id when creating and sends the whole row on update.
    sanitize: (body) => pick(body, ["name", "company", "email", "phone", "status"]),
  },

  deals: {
    prefix: "d",
    fields: ["title", "customer", "owner", "stage", "value", "createdDate", "expectedClose"],
    searchFields: ["title", "customer", "owner"],
    required: ["title", "customer", "owner", "stage", "value", "expectedClose"],
    check: (row, errors) => {
      if (!Number.isFinite(Number(row.value))) errors.value = "Value must be a number";
      if (row.expectedClose && !ISO_DATE.test(String(row.expectedClose))) {
        errors.expectedClose = "Use YYYY-MM-DD format";
      }
    },
    // `createdDate` is server-assigned so clients cannot backdate records.
    sanitize: (body) => pick(body, ["title", "customer", "owner", "stage", "value", "expectedClose"]),
  },

  leads: {
    prefix: "l",
    fields: ["name", "company", "email", "phone", "status", "source", "assignedRep", "createdDate"],
    searchFields: ["name", "company", "email", "assignedRep"],
    required: ["name", "company", "email", "phone", "status", "source", "assignedRep"],
    check: (row, errors) => {
      if (!EMAIL.test(String(row.email))) errors.email = "Invalid email address";
      if (!PHONE.test(String(row.phone))) errors.phone = "Invalid phone number";
    },
    // `createdDate` is server-assigned.
    sanitize: (body) => pick(body, ["name", "company", "email", "phone", "status", "source", "assignedRep"]),
  },
};

function pick(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function validate(config, body, { partial }) {
  const errors = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const value = config.sanitize(body);

  if (!partial) {
    for (const field of config.required) {
      const raw = value[field];
      if (raw === undefined || raw === null || String(raw).trim() === "") {
        errors[field] = `${field} is required`;
      }
    }
  }

  config.check(value, errors);

  // `value` arrives as a string from the deal modal's number input.
  if (value.value !== undefined) value.value = Number(value.value);

  return { value, errors };
}

export { validate };
