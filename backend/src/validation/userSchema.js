const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(body) {
  const errors = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (name.length < 2) errors.name = "Name must be at least 2 characters";
  if (!EMAIL.test(email)) errors.email = "Enter a valid email address";

  // bcrypt silently truncates beyond 72 bytes, so reject rather than accept a
  // password whose tail is ignored.
  if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  } else if (Buffer.byteLength(password, "utf8") > 72) {
    errors.password = "Password must be at most 72 bytes";
  }

  return { value: { name, email, password }, errors };
}

export function validateLogin(body) {
  const errors = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { value: {}, errors: { _: "Request body must be a JSON object" } };
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";

  return { value: { email, password }, errors };
}
