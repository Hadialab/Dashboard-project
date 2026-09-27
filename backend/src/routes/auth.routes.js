import express from "express";
import bcrypt from "bcryptjs";
import { all, insert } from "../db/store.js";
import { signToken } from "../auth/tokens.js";
import { requireAuth } from "../auth/requireAuth.js";
import { validateLogin, validateRegistration } from "../validation/userSchema.js";
import { badRequest, conflict, unauthorized } from "../utils/httpError.js";

const router = express.Router();

// Hash of a value nobody can supply. Comparing against it when the email is
// unknown keeps login responses uniform in both message and timing.
const DUMMY_HASH = bcrypt.hashSync("no-such-account", 10);

function findByEmail(email) {
  return all("users").find((user) => user.email === String(email).toLowerCase()) ?? null;
}

// The shape returned to the client. Deliberately no passwordHash.
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role ?? "user" };
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
    role: "user",
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

export default router;
