const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared field checks. `organizationName` is only required on public sign-up,
// where it names a brand new company; an admin adding someone to their own
// company already knows the name and must not be asked for it again.
function collectErrors(body, { requireOrganization }) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const errors = {};

  const name = String(body.name ?? "").trim();
  const organizationName = String(body.organizationName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (name.length < 2) errors.name = "Name must be at least 2 characters";

  if (requireOrganization && organizationName.length < 2) {
    errors.organizationName = "Company name must be at least 2 characters";
  }

  if (!EMAIL.test(email)) errors.email = "Enter a valid email address";

  // bcrypt silently truncates beyond 72 bytes, so reject rather than accept a
  // password whose tail would be ignored.
  if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  } else if (Buffer.byteLength(password, "utf8") > 72) {
    errors.password = "Password must be at most 72 bytes";
  }

  return { value: { name, organizationName, email, password }, errors };
}

/**
 * Public sign-up. Every signup creates its own company, so the name is required
 * and the person registering becomes that company's admin.
 */
export function validateRegistration(body) {
  return collectErrors(body, { requireOrganization: true });
}

/** An admin adding a teammate to their existing company. */
export function validateNewUser(body) {
  return collectErrors(body, { requireOrganization: false });
}

export function validateLogin(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const errors = {};

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";

  return { value: { email, password }, errors };
}
