import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { customers, deals, leads } from "./seedData.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", "..", "data");
const dbFile = path.join(dataDir, "db.json");

// Collections the API exposes, and the id prefix each one uses.
export const collections = {
  customers: { rows: customers, prefix: "c" },
  deals: { rows: deals, prefix: "d" },
  leads: { rows: leads, prefix: "l" },
};

// Creates data/db.json from the seed data. Existing files are left alone
// unless `force` is set, so restarts never wipe data you added by hand.
export function seed({ force = false } = {}) {
  if (fs.existsSync(dbFile) && !force) return dbFile;

  fs.mkdirSync(dataDir, { recursive: true });

  const contents = {};
  for (const [name, { rows }] of Object.entries(collections)) {
    contents[name] = structuredClone(rows);
  }

  fs.writeFileSync(dbFile, `${JSON.stringify(contents, null, 2)}\n`, "utf8");
  return dbFile;
}

export { dbFile, dataDir };
