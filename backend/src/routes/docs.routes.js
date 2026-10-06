import express from "express";

import { buildOpenApiDocument } from "../docs/openapi.js";
import { renderDocsPage } from "../docs/render.js";
import { config } from "../config.js";

const router = express.Router();

// The API reference.
//
// Unauthenticated, deliberately. The document describes endpoints, not data: it
// contains no record, no tenant, and nothing a caller cannot read from the source.
// Gating it would mean the reference is only reachable by people who already have a
// token — which is precisely the audience that does not need it, since anyone
// integrating needs to read the docs before they have an account.
//
// What it does NOT expose: `/audit` returns real audit rows and stays admin-only.
// This describes it, and that is the whole of what it says about it.

const document = buildOpenApiDocument({ appUrl: config.appUrl });

/** The machine-readable document. */
router.get("/openapi.json", (_req, res) => {
  res.json(document);
});

/** The reference, rendered. */
router.get("/docs", (_req, res) => {
  res.type("html").send(renderDocsPage(document));
});

export { document };
export default router;