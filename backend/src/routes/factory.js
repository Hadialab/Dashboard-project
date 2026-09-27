import express from "express";
import * as store from "../db/store.js";
import { runQuery } from "../utils/query.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { validate } from "../validation/resources.js";

// Builds CRUD routes for one collection. The three resources differ only in
// their fields and validation, so they share this implementation.
export function createResourceRouter(name, config) {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.json(runQuery(store.all(name), req.query, config));
  });

  router.get("/:id", (req, res) => {
    const row = store.findById(name, req.params.id);
    if (!row) throw notFound(`${name.slice(0, -1)} not found`);
    res.json(row);
  });

  router.post("/", (req, res) => {
    const { value, errors } = validate(config, req.body, { partial: false });
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    const created = store.insert(name, withDefaults(config, value));
    res.status(201).json(created);
  });

  // PUT is treated as a full replace, matching what the frontend sends (it
  // always submits the whole row). id and createdDate stay server-owned.
  router.put("/:id", (req, res) => {
    if (!store.findById(name, req.params.id)) {
      throw notFound(`${name.slice(0, -1)} not found`);
    }

    const { value, errors } = validate(config, req.body, { partial: false });
    if (Object.keys(errors).length > 0) throw badRequest("Validation failed", errors);

    res.json(store.update(name, req.params.id, withDefaults(config, value)));
  });

  router.delete("/:id", (req, res) => {
    const removed = store.remove(name, req.params.id);
    if (!removed) throw notFound(`${name.slice(0, -1)} not found`);
    res.json(removed);
  });

  return router;
}

function withDefaults(config, value) {
  const row = { ...value };

  // Only deals and leads carry a createdDate, and clients never set it.
  if (config.fields.includes("createdDate") && !row.createdDate) {
    row.createdDate = new Date().toISOString().slice(0, 10);
  }

  return row;
}
