import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

import { buildOpenApiDocument } from "../docs/openapi.js";
import { renderDocsPage } from "../docs/render.js";
import { createApp } from "../app.js";
import { resources } from "../validation/resources.js";

// The drift guard.
//
// A spec maintained by hand is a snapshot: correct on the day it is written and
// quietly wrong after the next release, with nothing to say so. Generating the CRM
// collections from the resource config removes most of the risk, but the
// hand-written sections could still drift from the code.
//
// So these check the document against the app in both directions — a handler that
// exists and is undocumented fails, and so does a documented path that no longer
// exists. "The docs are stale" becomes something CI refuses rather than something a
// user discovers.

const document = buildOpenApiDocument({ appUrl: "http://localhost:5000" });

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/**
 * Whether the app has a handler at this path.
 *
 * Probed over real HTTP rather than read from Express's router internals, because
 * recovering mount prefixes means parsing `layer.regexp` — a path-to-regexp
 * implementation detail that breaks silently on an upgrade.
 *
 * The signal is robust: every route except `/health`, the `/auth` entry points and
 * the docs requires a bearer token, so a mounted path answers 401 and an unmounted
 * one falls through to the not-found handler and answers 404.
 */
async function probe(app, method, path) {
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      redirect: "manual",
    });

    return response.status;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

/** Every path the app serves. `{id}` stands in for whatever the id would be. */
async function servedPaths() {
  const app = createApp();
  const candidates = new Set();

  for (const name of Object.keys(resources)) {
    candidates.add(`/${name}`);
    candidates.add(`/${name}/x001`);
  }

  for (const path of [
    "/auth/register", "/auth/login", "/auth/me", "/auth/users", "/auth/users/1",
    "/auth/users/1/role", "/auth/users/1/permissions", "/auth/users/1/permissions/reset",
    "/auth/forgot-password", "/auth/reset-password",
    "/notes", "/notes/1", "/followups", "/followups/x001", "/followups/x001/notify",
    "/leads/x001/convert", "/audit", "/events", "/events/ticket",
    "/openapi.json", "/docs", "/health",
  ]) {
    candidates.add(path);
  }

  const served = new Set();

  for (const path of candidates) {
    // Any method will do. `router.use(requireAuth)` gates a whole router, so an
    // unrecognised method on a mounted path still answers 401 — which is exactly
    // why methods are checked at the source level below instead of over HTTP.
    for (const method of METHODS) {
      const status = await probe(app, method, path);
      if (status !== 404) {
        served.add(path.replace("x001", "{id}").replace(/\/1\b/, "/{id}"));
        break;
      }
    }
  }

  return served;
}

/**
 * Every path/method pair the route modules declare, read from source.
 *
 * A source scan because method coverage is not observable from outside — see the
 * note in `servedPaths`. It still catches the drift that matters: a new handler that
 * nobody documented.
 */
function declaredOperations() {
  const mounts = {
    "auth.routes.js": "/auth",
    "notes.routes.js": "/notes",
    "followUps.routes.js": "/followups",
    "leadConversion.routes.js": "/leads",
    "audit.routes.js": "/audit",
    "events.routes.js": "/events",
  };

  const declared = [];
  const dir = new URL("../routes/", import.meta.url);

  for (const [file, mount] of Object.entries(mounts)) {
    const source = readFileSync(new URL(file, dir), "utf8");

    // Handles both `router.get("/x",` and `router.get(\n  "/x",`.
    const pattern = /router\.(get|post|put|patch|delete)\(\s*\n?\s*"([^"]*)"/gi;
    let match;

    while ((match = pattern.exec(source)) !== null) {
      const routePath = match[2] === "/" ? "" : match[2];

      declared.push({
        method: match[1].toUpperCase(),
        path: `${mount}${routePath}`.replace("/:id", "/{id}"),
      });
    }
  }

  // The CRM collections come from the factory, not from a route file.
  for (const name of Object.keys(resources)) {
    for (const method of ["GET", "POST"]) declared.push({ method, path: `/${name}` });

    for (const method of ["GET", "PUT", "DELETE"]) {
      declared.push({ method, path: `/${name}/{id}` });
    }
  }

  // Served directly by app.js.
  for (const path of ["/health", "/docs", "/openapi.json"]) {
    declared.push({ method: "GET", path });
  }

  return declared;
}

describe("OpenAPI document", () => {
  it("is a valid 3.1 document shape", () => {
    expect(document.openapi).toBe("3.1.0");
    expect(document.info.title).toBeTruthy();
    expect(Object.keys(document.paths).length).toBeGreaterThan(0);
    expect(document.components.securitySchemes.bearerAuth).toBeDefined();
  });

  it("keys its paths by URL, not by resource name", () => {
    // A regression worth pinning: wrapping each collection's paths under the
    // resource name produced a document whose every path was nested one level too
    // deep — structurally valid, and rendering as nothing at all.
    for (const key of Object.keys(document.paths)) {
      expect(key.startsWith("/"), `"${key}" should start with a slash`).toBe(true);
    }
  });

  it("describes every path the app serves", async () => {
    const documented = new Set(Object.keys(document.paths));
    const missing = [...(await servedPaths())].filter((path) => !documented.has(path));

    expect(missing, `undocumented paths: ${missing.join(", ")}`).toEqual([]);
  });

  it("documents no path the app does not serve", async () => {
    // The other direction, and the one people forget: a documented path that no
    // longer exists is worse than a missing one, because a caller writes code
    // against it and gets a 404.
    const served = await servedPaths();
    const stale = Object.keys(document.paths).filter((path) => !served.has(path));

    expect(stale, `documented but not served: ${stale.join(", ")}`).toEqual([]);
  });

  it("documents every method a route module declares", () => {
    const gaps = declaredOperations().filter(
      ({ method, path }) => !document.paths[path]?.[method.toLowerCase()],
    );

    const described = gaps.map(({ method, path }) => `${method} ${path}`);
    expect(described, `undocumented operations: ${described.join(", ")}`).toEqual([]);
  });

  it("gives every operation a summary and at least one response", () => {
    const incomplete = [];

    for (const [path, item] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(item)) {
        if (method === "parameters") continue;

        if (!operation.summary) incomplete.push(`${method} ${path}: no summary`);
        if (Object.keys(operation.responses ?? {}).length === 0) {
          incomplete.push(`${method} ${path}: no responses`);
        }
      }
    }

    expect(incomplete).toEqual([]);
  });

  it("only references components that exist", () => {
    // A dangling $ref passes every structural check and renders as an empty object
    // in the reference, which is worse than a missing section.
    const dangling = [];

    // Resolved against the document itself rather than against
    // `components.schemas`, because the document also references
    // `#/components/responses/...` — validating only schemas would report those as
    // dangling when they are perfectly valid.
    const resolves = (ref) => {
      let node = document;

      for (const part of ref.replace(/^#\//, "").split("/")) {
        node = node?.[part];
        if (node === undefined) return false;
      }

      return true;
    };

    const walk = (node) => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      if (!node || typeof node !== "object") return;

      if (typeof node.$ref === "string" && !resolves(node.$ref)) dangling.push(node.$ref);

      Object.values(node).forEach(walk);
    };

    walk(document);
    expect(dangling).toEqual([]);
  });

  it("describes the CRM collections from the resource config, not by hand", () => {
    // The point of generating these: a field added to a resource appears in the
    // documented body without anyone touching the spec.
    const schema = document.paths["/customers"].post.requestBody.content[
      "application/json"
    ].schema;

    for (const field of resources.customers.fields) {
      expect(Object.keys(schema.properties), `missing ${field}`).toContain(field);
    }

    // Server-owned fields are documented as accepted-and-ignored, which is more
    // useful than omitting them: a client echoing a whole record back sends them.
    expect(schema.properties.id.readOnly).toBe(true);
    expect(schema.additionalProperties).toBe(false);
  });

  it("states that PUT is a replacement, because that is the surprising part", () => {
    expect(document.paths["/customers/{id}"].put.description).toMatch(/full replacement/i);
  });

  it("marks the admin-only endpoint as such", () => {
    // `/audit` is not governed by the permission table, and the reason is the
    // interesting part.
    expect(document.paths["/audit"].get.responses["403"].description).toMatch(/admin only/i);
  });
});

describe("renderDocsPage", () => {
  const html = renderDocsPage(document);

  it("is a complete HTML document", () => {
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("</html>");
  });

  it("escapes everything it interpolates", () => {
    // The reference embeds values from the resource config, and one of those could
    // eventually contain a quote. It must not be the one place an unescaped value
    // becomes markup.
    const hostile = renderDocsPage({
      ...document,
      info: { ...document.info, title: "<script>alert(1)</script>" },
    });

    expect(hostile).not.toContain("<script>alert(1)</script>");
    expect(hostile).toContain("&lt;script&gt;");
  });

  it("loads nothing over the network", () => {
    // The reference has to work offline and behind a corporate proxy, and a
    // CDN-hosted Swagger UI fails both — while also making the documentation a
    // third-party script with the reader's full trust.
    //
    // Asserted on how resources are loaded, not on the substring "cdn": the
    // descriptions legitimately contain that word while explaining all this.
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+href=["']https?:/i);
    expect(html).not.toMatch(/@import/i);
  });

  it("renders one card per operation", () => {
    const operations = Object.values(document.paths).reduce(
      (total, item) =>
        total + Object.keys(item).filter((key) => key !== "parameters").length,
      0,
    );

    expect((html.match(/<article/g) ?? []).length).toBe(operations);
  });

  it("marks the endpoints that need a token, and leaves the rest unmarked", () => {
    const articles = html.split("<article").slice(1);

    const health = articles.find((article) => article.includes("/health"));
    expect(health).toBeDefined();
    expect(health).not.toContain("requires auth");

    const customers = articles.find((article) => article.includes("/customers"));
    expect(customers).toContain("requires auth");
  });
});