import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { customers, deals, leads } from "./seedData.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", "..", "data");
const dbFile = path.join(dataDir, "db.json");

export const CUSTOMER_STATUSES = ["Active", "Inactive", "Prospect"];
export const DEAL_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
export const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Lost"];

// Collections the API exposes, and the id prefix each one uses.
// `users` is seeded with a demo account so there is something to sign in with;
// its password is hashed here rather than stored in seedData.js.
export const collections = {
  customers: { rows: customers, prefix: "c" },
  deals: { rows: deals, prefix: "d" },
  leads: { rows: leads, prefix: "l" },
  users: { rows: [], prefix: "u" },
};

const DEMO_USER = {
  id: "u001",
  name: "Hadi Al Abbassi",
  email: "admin@example.com",
  password: "admin123",
  role: "admin",
};

function seedUsers() {
  const { password, ...rest } = DEMO_USER;
  return [{ ...rest, passwordHash: bcrypt.hashSync(password, 10), createdAt: new Date().toISOString() }];
}

// Creates data/db.json from the seed data. Existing files are left alone
// unless `force` is set, so restarts never wipe data you added by hand.
export function seed({ force = false } = {}) {
  if (fs.existsSync(dbFile) && !force) return dbFile;

  fs.mkdirSync(dataDir, { recursive: true });

  const contents = {};
  for (const [name, { rows }] of Object.entries(collections)) {
    contents[name] = name === "users" ? seedUsers() : structuredClone(rows);
  }

  fs.writeFileSync(dbFile, `${JSON.stringify(contents, null, 2)}\n`, "utf8");
  return dbFile;
}

export { dbFile, dataDir };
