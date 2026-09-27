import express from "express";
import bcrypt from "bcryptjs";
import { all, insert, remove, update } from "../db/store.js";
import { signToken } from "../auth/tokens.js";
import { requireAuth } from "../auth/requireAuth.js";
import { ROLES, requireRole } from "../auth/roles.js";
import { validateLogin, validateRegistration } from "../validation/userSchema.js";
import { badRequest, conflict, notFound, unauthorized } from "../utils/httpError.js";

const router = express.Router();

// Hash of a value nobody can supply. Comparing against it when the email is
// unknown keeps login responses uniform in both message and timing.
const DUMMY_HASH = bcrypt.hashSync("no-such-account", 10);

function findByEmail(email) {
  return all("users").find((user) => user.email === String(email).toLowerCase()) ?? null;
}

// The shape returned to the client. Deliberately no passwordHash.
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role ?? "rep" };
}

router.post("/register", (req, res) => {
  const { value, errors } = validateRegistration(req.body);
  if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

  if (findByEmail(value.email)) {
    throw conflict("An account with this email already exists", { email: "Email is already registered" });
  }

  const user = insert("users", {
    name: value.name,
    email: value.email,
    passwordHash: bcrypt.hashSync(value.password, 10),
    // Self-registration can only ever produce a rep. Admins are created from
    // the Team page, so nobody can promote themselves by signing up.
    role: "rep",
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { value, errors } = validateLogin(req.body);
  if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

  const user = findByEmail(value.email);

  // Same message and a real bcrypt comparison either way, so the response does
  // not reveal whether an email is registered. A throwaway hash stands in for
  // the missing user to keep the timing similar.
  const passwordMatches = bcrypt.compareSync(
    value.password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !passwordMatches) {
    throw unauthorized("Invalid email or password");
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

// Lets the frontend confirm a stored token is still valid on page load,
// instead of trusting a cookie it cannot verify.
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ===== Admin-only: team management =====
// These live under /auth because they act on the users collection.

router.get("/users", requireAuth, requireRole("admin"), (_req, res) => {
  res.json(all("users").map(publicUser));
});

// Admin creates a rep. The only way to make another admin, which is why it is
// behind the admin gate.
router.post("/users", requireAuth, requireRole("admin"), (req, res) => {
  const { value, errors } = validateRegistration(req.body);
  if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

  if (findByEmail(value.email)) {
    throw conflict("An account with this email already exists", { email: "Email is already registered" });
  }

  const requestedRole = req.body?.role;
  if (requestedRole && !ROLES.includes(requestedRole)) {
    throw badRequest("Validation failed", { role: `Role must be one of: ${ROLES.join(", ")}` });
  }

  const user = insert("users", {
    name: value.name,
    email: value.email,
    passwordHash: bcrypt.hashSync(value.password, 10),
    role: requestedRole ?? "rep",
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(publicUser(user));
});

router.patch("/users/:id/role", requireAuth, requireRole("admin"), (req, res) => {
  const target = all("users").find((u) => u.id === req.params.id);
  if (!target) throw notFound("User not found");

  const { role } = req.body ?? {};

  if (!ROLES.includes(role)) {
    throw badRequest("Validation failed", { role: `Role must be one of: ${ROLES.join(", ")}` });
  }

  // Guard against removing the last admin, which would lock everyone out of
  // the team page with no way to recover.
  if (target.role === "admin" && role !== "admin") {
    const admins = all("users").filter((u) => u.role === "admin");
    if (admins.length <= 1) {
      throw conflict("Cannot demote the last administrator");
    }
  }

  res.json(publicUser(update("users", target.id, { role })));
});

router.delete("/users/:id", requireAuth, requireRole("admin"), (req, res) => {
  const target = all("users").find((u) => u.id === req.params.id);
  if (!target) throw notFound("User not found");

  if (target.id === req.user.id) {
    throw conflict("You cannot delete your own account");
  }

  if (target.role === "admin") {
    const admins = all("users").filter((u) => u.role === "admin");
    if (admins.length <= 1) {
      throw conflict("Cannot delete the last administrator");
    }
  }

  // Records owned by this user fall back to unassigned rather than being
  // deleted. They stop being visible to the departing rep and become the
  // admin's to reassign.
  for (const [name, ownerField] of [["leads", "ownerId"], ["deals", "ownerId"]]) {
    for (const row of all(name)) {
      if (row[ownerField] === target.id) {
        update(name, row.id, { [ownerField]: null });
      }
    }
  }

  res.json(publicUser(remove("users", target.id)));
});

export default router;
