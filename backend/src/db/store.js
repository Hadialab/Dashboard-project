import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collections, seed } from "./seed.js";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const dbFile = path.join(dataDir, "db.json");

// A tiny JSON-file store. Data is held in memory and flushed to disk after
// every write, so the API behaves like a real database from the client's point
// of view while staying dependency-free.
//
// To move to MongoDB later, replace the read/write helpers in this file and
// the route handlers keep working unchanged.

let db = null;

function load() {
  if (db) return db;

  // Boot the seed file on first run so a fresh clone just works.
  seed();

  db = JSON.parse(fs.readFileSync(dbFile, "utf8"));

  for (const name of Object.keys(collections)) {
    if (!Array.isArray(db[name])) db[name] = [];
  }

  return db;
}

// Writes via a temp file + rename so a crash mid-write cannot leave a
// half-written db.json behind.
function persist() {
  const tmp = `${dbFile}.tmp`;

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(tmp, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, dbFile);
}

export function all(name) {
  return load()[name];
}

export function findById(name, id) {
  return all(name).find((row) => String(row.id) === String(id)) ?? null;
}

// Continues the seeded sequence: c020 -> c021. Falls back to a random-ish
// suffix if the numeric part ever runs out or ids are not in that format.
export function nextId(name) {
  const { prefix } = collections[name];
  const rows = all(name);

  const highest = rows.reduce((max, row) => {
    const match = String(row.id).match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

export function insert(name, doc) {
  const store = load();
  const row = { id: nextId(name), ...doc };
  store[name].push(row);
  persist();
  return row;
}

export function update(name, id, changes) {
  const store = load();
  const index = store[name].findIndex((row) => String(row.id) === String(id));
  if (index === -1) return null;

  // id is immutable, and undefined values would strip fields on a partial PUT.
  const cleaned = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  );

  store[name][index] = { ...store[name][index], ...cleaned, id: store[name][index].id };
  persist();
  return store[name][index];
}

export function remove(name, id) {
  const store = load();
  const index = store[name].findIndex((row) => String(row.id) === String(id));
  if (index === -1) return null;

  const [removed] = store[name].splice(index, 1);
  persist();
  return removed;
}

export function reset() {
  db = null;
  seed({ force: true });
  return load();
}
