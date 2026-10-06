import { resources, TIMELINE } from "../validation/resources.js";

// The API description, as an OpenAPI 3.1 document.
//
// Built in code rather than shipped as a static JSON file for two reasons.
//
// The first is drift. The CRM collections are generated from the `resources` config
// — paths, bodies and permissions all come from one description of each record
// type — so describing them by hand means a field added to a resource is documented
// in the spec only if someone remembers. Deriving them means the field list cannot
// disagree with the validator's.
//
// The second is that a static file is checked by nobody. `openapi.json` served from
// disk is a snapshot that is correct on the day it is written and quietly wrong
// after the next release; a test walks the Express router and fails when a path
// exists that the spec does not describe, which turns "the docs are stale" from
// something a user discovers into something CI refuses.

/** The contact that appears on every authentication failure, so callers can react. */
const errorResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

const bearerAuth = [{ bearerAuth: [] }];

/** A JSON body schema built from a resource's field list. */
function recordBody(resource, { partial = false } = {}) {
  const properties = {};
  const required = [];

  for (const field of resource.fields) {
    const schema = FIELD_SCHEMA[field] ?? { type: "string", nullable: true };
    properties[field] = schema;

    if (!partial && resource.required?.includes(field)) required.push(field);
  }

  // Server-owned fields are accepted but ignored, and saying so is more useful than
  // omitting them: a client echoing a whole record back will send them.
  properties.id = { type: "string", readOnly: true, description: "Server-assigned. Ignored on write." };
  properties.ownerId = { type: "integer", readOnly: true, nullable: true };
  properties.createdDate = { type: "string", format: "date", readOnly: true };

  return {
    required,
    properties,
    // Anything not listed is rejected by the API rather than silently dropped, so
    // `additionalProperties: false` is the truth rather than a tightening.
    additionalProperties: false,
  };
}

const FIELD_SCHEMA = {
  email: { type: "string", format: "email", example: "contact@example.com" },
  phone: { type: "string", example: "+961 1 234 567" },
  status: { type: "string", enum: ["Active", "Inactive"] },
  stage: { type: "string", enum: ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] },
  value: { type: "number", description: "Deal value. Never a float: money is NUMERIC(14,2).", example: 25000 },
  expectedClose: { type: "string", format: "date", example: "2026-12-31" },
  createdDate: { type: "string", format: "date" },
  permissions: { type: "object", additionalProperties: true },
};

const standardErrors = {
  "400": errorResponse("Validation failed. `details` maps field names to messages."),
  "401": errorResponse("Not signed in, or the token expired."),
  "403": errorResponse("Signed in, but not permitted."),
  "404": errorResponse(
    "Not found. Also returned for a record that exists but that you may not see, " +
      "so this cannot be used to probe for other tenants' ids.",
  ),
};

/**
 * The three CRM collections, generated from the resource config.
 *
 * `PUT` is documented as a full replacement because that is what it is: a missing
 * field is a cleared field. A partial update is `PATCH`, which the CRM collections
 * do not offer — worth stating in the docs, because "why did my empty field go
 * blank" is the obvious first question.
 */
function collectionPaths(name, resource) {
  const singular = name.replace(/s$/, "");
  const tag = singular[0].toUpperCase() + singular.slice(1);

  const row = {
    type: "object",
    properties: {
      id: { type: "string", example: `${resource.prefix}001` },
      ...Object.fromEntries(
        resource.fields.map((field) => [field, FIELD_SCHEMA[field] ?? { type: "string" }]),
      ),
      createdAt: { type: "string", format: "date-time", readOnly: true },
      updatedAt: { type: "string", format: "date-time", readOnly: true },
    },
  };

  return {
    [`/${name}`]: {
      get: {
        tags: [tag],
        summary: `List ${name}`,
        description:
          "Scoped to your organization, and filtered further by your permissions: a rep with " +
          '"own records only" sees only records they own. Returns a page with `items`, `total` ' +
          "and `page`.",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "rows", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "A page of records.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: row },
                    total: { type: "integer" },
                    page: { type: "integer" },
                  },
                },
              },
            },
          },
          ...standardErrors,
        },
      },
      post: {
        tags: [tag],
        summary: `Create a ${singular}`,
        security: bearerAuth,
        requestBody: {
          required: true,
          content: { "application/json": { schema: recordBody(resource) } },
        },
        responses: {
          "201": {
            description: "The created record.",
            content: { "application/json": { schema: row } },
          },
          ...standardErrors,
        },
      },
    },

    [`/${name}/{id}`]: {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", example: `${resource.prefix}001` },
        },
      ],
      get: {
        tags: [tag],
        summary: `Fetch one ${singular}`,
        security: bearerAuth,
        responses: {
          "200": {
            description: "The record.",
            content: { "application/json": { schema: row } },
          },
          ...standardErrors,
        },
      },
      put: {
        tags: [tag],
        summary: `Replace a ${singular}`,
        description:
          "**A full replacement.** Any field you omit is cleared. Send the whole record back, " +
          "which is what the app's own forms do.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: { "application/json": { schema: recordBody(resource) } },
        },
        responses: {
          "200": {
            description: "The updated record.",
            content: { "application/json": { schema: row } },
          },
          ...standardErrors,
        },
      },
      delete: {
        tags: [tag],
        summary: `Delete a ${singular}`,
        security: bearerAuth,
        responses: {
          "200": { description: "The deleted record." },
          ...standardErrors,
        },
      },
    },
  };
}

export function buildOpenApiDocument({ appUrl = "http://localhost:5000" } = {}) {
  // Each resource's paths are merged in at the top level, so `paths` is keyed by
  // URL — `{ customers: { "/customers": ... } }` would nest them one level too deep
  // and produce a document with no valid paths in it at all.
  const collections = Object.assign(
    {},
    ...Object.entries(resources).map(([name, resource]) => collectionPaths(name, resource)),
  );

  return {
    openapi: "3.1.0",

    info: {
      title: "CRM Dashboard API",
      version: "1.0.0",
      description: [
        "A multi-tenant CRM API. Every request is scoped to the organization that owns your",
        "session, and no endpoint will return another tenant's records — a request for an id",
        "you may not see is answered `404` rather than `403`, so ids cannot be probed for.",
        "",
        "## Authenticating",
        "",
        "`POST /auth/login` or `POST /auth/register` returns a bearer token. Send it as",
        "`Authorization: Bearer <token>`. It is valid for `JWT_EXPIRES_IN`, default 12h.",
        "",
        "## Roles and permissions",
        "",
        "An `admin` bypasses the permission table entirely. Any other user is a `rep`, limited",
        "to what their `permissions` object allows, per resource and per action.",
        "",
        "## Money and dates",
        "",
        "Amounts are `NUMERIC(14,2)` and arrive as strings, because a float loses cents and a",
        "CRM whose totals are off by a few cents is a CRM nobody trusts. Dates that mean a day",
        "(`expectedClose`, `createdDate`) are `YYYY-MM-DD`; timestamps are RFC 3339 in UTC.",
      ].join("\n"),
    },

    servers: [{ url: appUrl, description: "This deployment" }],

    tags: [
      { name: "Auth", description: "Sessions, registration and password resets." },
      { name: "Notes", description: "The activity timeline on a record." },
      { name: "Follow-ups", description: "Scheduled work, and reminders." },
      { name: "Audit", description: "Who changed what, admin only." },
      { name: "Live", description: "Server-sent change notifications." },
      {
        name: "Tenant",
        description: "Company settings, API keys and webhooks. Admin only.",
      },
      ...Object.keys(resources).map((name) => ({
        name: name.replace(/s$/, "").replace(/^./, (c) => c.toUpperCase()),
      })),
    ],

    paths: {
      ...collections,

      // ===== Auth =====
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Create a company and its first admin",
          description:
            "There is no way to join an existing company: every signup creates a new one, and " +
            "the person registering becomes its admin. This is why there is no invited-signup " +
            "flow — an admin adds teammates from `/auth/users` instead.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["organizationName", "name", "email", "password"],
                  properties: {
                    organizationName: { type: "string", example: "Acme Sales" },
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 6, maxLength: 72 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { $ref: "#/components/responses/AuthResponse" },
            "400": errorResponse("Validation failed."),
            "409": errorResponse("That email is already registered."),
          },
        },
      },

      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Exchange credentials for a token",
          description:
            "Answers `401` with the same message whether the address is unknown or the password " +
            "is wrong, and takes the same time either way, so this endpoint cannot be used to " +
            "discover which addresses have accounts.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { $ref: "#/components/responses/AuthResponse" },
            "401": errorResponse("Invalid email or password."),
          },
        },
      },

      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "The current user and organization",
          security: bearerAuth,
          responses: {
            "200": { $ref: "#/components/responses/AuthResponse" },
            "401": errorResponse("Not signed in."),
          },
        },
      },

      "/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Request a password reset link",
          description:
            "Returns the same message and status whether or not the address is registered, and " +
            "whether or not mail actually went out. Anything else would turn this into a way to " +
            "enumerate every account in the install. **If no email provider is configured on the " +
            "server, no link is sent** and the answer is the same — check the deployment's " +
            "configuration before assuming a user has no account.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Always the same answer.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "If an account exists with that address, a reset link is on its way.",
                      },
                    },
                  },
                },
              },
            },
            "400": errorResponse("Not a usable email address."),
            "429": errorResponse("Too many reset links requested for one account."),
          },
        },
      },

      "/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Set a new password from a reset link",
          description:
            "The token works once and expires in 15 minutes. **No session token is returned** — " +
            "you sign in with the new password afterwards. A malformed token, an unknown one, " +
            "an expired one and an already-used one all get the same rejection, so this cannot " +
            "be used to test whether a guessed token existed.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["token", "password"],
                  properties: {
                    token: { type: "string", pattern: "^[a-f0-9]{64}$" },
                    password: { type: "string", minLength: 6, maxLength: 72 },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "The password was changed. Sign in again.",
              content: {
                "application/json": {
                  schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } },
                },
              },
            },
            "400": errorResponse("Validation failed, or the link is no longer valid."),
          },
        },
      },

      "/auth/users": {
        get: {
          tags: ["Auth"],
          summary: "List your company's team",
          description: "Admin only. Scoped to your own company.",
          security: bearerAuth,
          responses: {
            "200": {
              description: "Every user in your organization.",
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/User" } },
                },
              },
            },
            ...standardErrors,
          },
        },
        post: {
          tags: ["Auth"],
          summary: "Add a team member",
          description: "Admin only. Recorded in the audit log as a permission grant.",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 6 },
                    role: { type: "string", enum: ["admin", "rep"], default: "rep" },
                    permissions: { $ref: "#/components/schemas/Permissions" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "The created user.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
            },
            ...standardErrors,
          },
        },
      },

      "/auth/users/{id}": {
        delete: {
          tags: ["Auth"],
          summary: "Remove a team member",
          description:
            "Admin only. Their records become unassigned rather than being deleted. The removal " +
            "is audited, and the audit entry outlives the account.",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": {
              description: "The removed user.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
            },
            ...standardErrors,
            "409": errorResponse("Cannot remove the last administrator."),
          },
        },
      },

      "/auth/users/{id}/role": {
        patch: {
          tags: ["Auth"],
          summary: "Change a role",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["role"],
                  properties: { role: { type: "string", enum: ["admin", "rep"] } },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "The updated user.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
            },
            ...standardErrors,
            "409": errorResponse("Cannot demote the last administrator."),
          },
        },
      },

      "/auth/users/{id}/permissions": {
        patch: {
          tags: ["Auth"],
          summary: "Change what a user can reach",
          description:
            "A partial update: send only the actions you are changing and the rest are left " +
            "alone. Audited per action, so `customers.edit: own → all` is answerable months " +
            "later.",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  properties: {
                    customers: { $ref: "#/components/schemas/PermissionSet" },
                    leads: { $ref: "#/components/schemas/PermissionSet" },
                    deals: { $ref: "#/components/schemas/PermissionSet" },
                    reports: { $ref: "#/components/schemas/PermissionSet" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "The updated user.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
            },
            ...standardErrors,
          },
        },
      },

      "/auth/users/{id}/permissions/reset": {
        post: {
          tags: ["Auth"],
          summary: "Restore a user's default permissions",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": {
              description: "The updated user.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
            },
            ...standardErrors,
          },
        },
      },

      // ===== Conversion =====
      "/leads/{id}/convert": {
        post: {
          tags: ["Lead"],
          summary: "Turn a qualified lead into a customer",
          description:
            "One request, one transaction: the customer is created and the lead is marked " +
            "`Converted` together or not at all. A half-converted lead — a customer created but " +
            "the lead still open — is worse than one that did not convert, so it is not a state " +
            "this can reach. A converted lead is never deleted, which is what makes a second " +
            "conversion detectable.",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "201": {
              description: "The new customer, and the lead's new state.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      customer: { $ref: "#/components/schemas/Customer" },
                      leadId: { type: "string" },
                      leadStatus: { type: "string", enum: ["Converted"] },
                      convertedCustomerId: { type: "string" },
                    },
                  },
                },
              },
            },
            ...standardErrors,
            "409": errorResponse("This lead has already been converted."),
          },
        },
      },

      // ===== Notes =====
      "/notes": {
        get: {
          tags: ["Notes"],
          summary: "A record's timeline",
          description:
            "Notes and events together. Events are written by the server when a record is " +
            "created or a tracked field changes, which is why a timeline is never a blank page. " +
            "Tracked fields are " +
            JSON.stringify(TIMELINE) +
            ".",
          security: bearerAuth,
          parameters: [
            { name: "entityType", in: "query", required: true, schema: { type: "string", enum: ["customer", "lead", "deal"] } },
            { name: "entityId", in: "query", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "The timeline, oldest first.",
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/Note" } },
                },
              },
            },
            ...standardErrors,
          },
        },
        post: {
          tags: ["Notes"],
          summary: "Add a note",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["entityType", "entityId", "body"],
                  properties: {
                    entityType: { type: "string", enum: ["customer", "lead", "deal"] },
                    entityId: { type: "string" },
                    body: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "The note." }, ...standardErrors },
        },
      },

      "/notes/{id}": {
        delete: {
          tags: ["Notes"],
          summary: "Delete one of your notes",
          description:
            "Only `kind: \"note\"` can be deleted, and only by its author. Server-written events " +
            "are part of the record's history and are not removable.",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted." }, ...standardErrors },
        },
      },

      // ===== Follow-ups =====
      "/followups": {
        get: {
          tags: ["Follow-ups"],
          summary: "Scheduled work across every record you can see",
          security: bearerAuth,
          parameters: [
            { name: "due", in: "query", schema: { type: "string", enum: ["overdue", "today", "upcoming"] } },
          ],
          responses: {
            "200": {
              description: "Matching follow-ups.",
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/FollowUp" } },
                },
              },
            },
            ...standardErrors,
          },
        },
        post: {
          tags: ["Follow-ups"],
          summary: "Schedule a follow-up",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["entityType", "entityId", "title", "dueAt"],
                  properties: {
                    entityType: { type: "string", enum: ["customer", "lead", "deal"] },
                    entityId: { type: "string" },
                    title: { type: "string" },
                    type: { type: "string", enum: ["call", "email", "meeting", "task"] },
                    dueAt: { type: "string", format: "date" },
                    details: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "The follow-up." }, ...standardErrors },
        },
      },

      "/followups/{id}": {
        patch: {
          tags: ["Follow-ups"],
          summary: "Update or complete a follow-up",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  properties: {
                    title: { type: "string" },
                    status: { type: "string", enum: ["pending", "done"] },
                    details: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "The updated follow-up." }, ...standardErrors },
        },
        delete: {
          tags: ["Follow-ups"],
          summary: "Delete a follow-up",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted." }, ...standardErrors },
        },
      },

      "/followups/{id}/notify": {
        post: {
          tags: ["Follow-ups"],
          summary: "Send the reminder by email",
          description:
            "Needs an email provider configured on the server. Without one this returns " +
            "`providerConfigured: false` and a `mailto:` link for the client to fall back on. " +
            "**A deal has no contact address of its own** — deals store a customer by name — so " +
            "this returns a reason rather than sending.",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Sent, or an explanation of why not.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      sent: { type: "boolean" },
                      reason: { type: "string", nullable: true },
                      mailto: { type: "string", nullable: true },
                      providerConfigured: { type: "boolean" },
                    },
                  },
                },
              },
            },
            ...standardErrors,
          },
        },
      },

      // ===== Audit =====
      "/audit": {
        get: {
          tags: ["Audit"],
          summary: "The company's audit log",
          description:
            "Admin only. Append-only, and there is no route that edits or deletes an entry. " +
            "Records **every** field that changed, not only the ones the activity timeline " +
            "narrates — a log that omitted a changed email address would be worse than none. " +
            "Entries outlive the people and records they name, so one from a deleted account is " +
            "still readable and still filterable by name. Dates are matched in **UTC**.",
          security: bearerAuth,
          parameters: [
            { name: "actorId", in: "query", schema: { type: "integer" } },
            { name: "actorName", in: "query", description: "Use after an account is deleted and its id is gone.", schema: { type: "string" } },
            { name: "entityType", in: "query", schema: { type: "string", enum: ["customer", "lead", "deal", "user"] } },
            { name: "entityId", in: "query", description: "Substring match.", schema: { type: "string" } },
            { name: "action", in: "query", schema: { type: "string", enum: ["create", "update", "delete", "convert", "permission_change", "password_change"] } },
            { name: "from", in: "query", schema: { type: "string", format: "date" } },
            { name: "to", in: "query", schema: { type: "string", format: "date" } },
            { name: "limit", in: "query", schema: { type: "integer", maximum: 500, default: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": {
              description: "A page of entries, newest first.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      entries: { type: "array", items: { $ref: "#/components/schemas/AuditEntry" } },
                      total: { type: "integer" },
                      limit: { type: "integer" },
                      offset: { type: "integer" },
                      actors: {
                        type: "array",
                        description: "Everyone with an entry, so a removed account stays filterable.",
                        items: {
                          type: "object",
                          properties: { id: { type: "integer", nullable: true }, name: { type: "string" } },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": errorResponse("Not signed in."),
            "403": errorResponse("Admin only. The permission table does not govern this section."),
          },
        },
      },

      // ===== Live updates =====
      "/events/ticket": {
        post: {
          tags: ["Live"],
          summary: "Mint a ticket for the change stream",
          description:
            "`EventSource` cannot send an `Authorization` header, so the stream authenticates " +
            "with a short-lived ticket instead of a session token — a session token in a query " +
            "string would be written to proxy logs and browser history. Fetch a fresh ticket for " +
            "every connection.",
          security: bearerAuth,
          responses: {
            "200": {
              description: "A ticket, and how long it lasts.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ticket: { type: "string" }, expiresIn: { type: "integer", example: 30 } },
                  },
                },
              },
            },
            "401": errorResponse("Not signed in."),
          },
        },
      },

      "/events": {
        get: {
          tags: ["Live"],
          summary: "Server-sent change notifications",
          description: [
            "A `text/event-stream` of records changing in **your** organization.",
            "",
            "Server-Sent Events rather than a WebSocket, because the application only ever needs",
            "server-to-client messages — there is nothing to send back over the stream.",
            "",
            "Each event carries identifiers and an actor's display name, and deliberately **no",
            "record data**: react by refetching. That keeps tenant data off a wire that does not",
            "need it, and means a missed event costs a refresh rather than a wrong value.",
            "",
            "Events are carried over Postgres `LISTEN/NOTIFY`, so they reach clients connected to",
            "any API process rather than only the one that handled the write.",
          ].join("\n"),
          parameters: [
            {
              name: "ticket",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "The stream.",
              content: { "text/event-stream": { schema: { type: "string" } } },
            },
            "401": errorResponse("Missing, malformed or expired ticket."),
            "503": errorResponse("Too many streams open. Retry after a moment."),
          },
        },
      },

      // ===== The docs themselves =====
      // ===== Tenant administration =====
      "/tenant/settings": {
        get: {
          tags: ["Tenant"],
          summary: "Your company's settings",
          description:
            "Admin only. Returns the company's display name, logo, website, support address, " +
            "what a new teammate gets by default, and the default locale and timezone.",
          security: bearerAuth,
          responses: {
            "200": {
              description: "The settings.",
              content: {
                "application/json": {
                  schema: { type: "object", properties: {
                    displayName: { type: "string" },
                    logoUrl: { type: "string", nullable: true },
                    website: { type: "string", nullable: true },
                    supportEmail: { type: "string", nullable: true },
                    defaultRole: { type: "string", enum: ["admin", "rep"] },
                    defaultPermissions: { $ref: "#/components/schemas/Permissions" },
                    locale: { type: "string" },
                    timezone: { type: "string" },
                  } },
                },
              },
            },
            "401": errorResponse("Not signed in."),
            "403": errorResponse("Admin only."),
          },
        },
        patch: {
          tags: ["Tenant"],
          summary: "Update your company's settings",
          description:
            "Admin only. A partial update — an omitted field keeps its current value. " +
            "`logoUrl` and `website` must be `http` or `https`, because they are rendered " +
            "into every user's session and a `javascript:` value would be stored XSS.",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "200": { description: "The updated settings." },
            "400": errorResponse("Validation failed."),
            "403": errorResponse("Admin only."),
          },
        },
      },

      "/tenant/settings/defaults": {
        get: {
          tags: ["Tenant"],
          summary: "What a new teammate would get right now",
          description:
            "Admin only. Reports the company's configured defaults alongside the " +
            "server's own fallback, so the UI can explain what a new account receives " +
            "without hard-coding a second copy of the policy.",
          security: bearerAuth,
          responses: {
            "200": { description: "The defaults, and the built-in fallback." },
            "403": errorResponse("Admin only."),
          },
        },
      },

      "/tenant/api-keys/check-label": {
        post: {
          tags: ["Tenant"],
          summary: "Check whether an API key name is free",
          description:
            "Admin only. The label is the only field with no natural key, so it is the only " +
            "way two rows can end up indistinguishable in the list — and 'which key was " +
            "this?' is the first question asked when one has to be revoked.",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { required: ["label"], properties: { label: { type: "string" } } },
              },
            },
          },
          responses: {
            "200": { description: "The name is free." },
            "409": errorResponse("A live key already uses that name."),
            "403": errorResponse("Admin only."),
          },
        },
      },

      "/tenant/api-keys": {
        get: {
          tags: ["Tenant"],
          summary: "List the company's API keys",
          description:
            "Admin only. Each key is shown by its label and an 8-character prefix. **The " +
            "secret is never returned again after it is created** — only a hash is stored, " +
            "so a database leak yields no working key for any company in it.",
          security: bearerAuth,
          responses: {
            "200": { description: "The keys, and the scope names available." },
            "403": errorResponse("Admin only."),
          },
        },
        post: {
          tags: ["Tenant"],
          summary: "Create an API key",
          description:
            "Admin only. The plaintext key is returned **once**, in " +
            "`apiKeyOneTimeSecret`, and cannot be retrieved again. " +
            "A key authenticates in place of a session token and is scoped to what it " +
            "carries; `write` implies `read`. A key is never an admin, cannot reach `/auth`, " +
            "`/audit` or `/tenant`, and revoking one takes effect on its next request.",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["label"],
                  properties: {
                    label: { type: "string", description: "A name you will recognise later." },
                    scopes: {
                      type: "array",
                      items: { type: "string", enum: [
                        "customers:read", "customers:write",
                        "leads:read", "leads:write",
                        "deals:read", "deals:write",
                        "reports:read",
                      ] },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "The key. `apiKeyOneTimeSecret` is the only time it is readable.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      keyPrefix: { type: "string" },
                      apiKeyOneTimeSecret: { type: "string", description: "Shown once." },
                    },
                  },
                },
              },
            },
            "400": errorResponse("Validation failed."),
            "403": errorResponse("Admin only."),
          },
        },
      },

      "/tenant/api-keys/{id}": {
        delete: {
          tags: ["Tenant"],
          summary: "Revoke an API key",
          description:
            "Admin only. Revoked rather than deleted, so an audit reader can still see that " +
            "the key existed and when it stopped working.",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Revoked." },
            "404": errorResponse("Not found, or already revoked."),
            "403": errorResponse("Admin only."),
          },
        },
      },

      "/tenant/webhooks": {
        get: {
          tags: ["Tenant"],
          summary: "List the company's webhooks",
          description:
            "Admin only. Includes the last ten delivery attempts per subscription, so " +
            "\"did it fire\" is answerable without leaving the app.",
          security: bearerAuth,
          responses: {
            "200": { description: "The subscriptions." },
            "403": errorResponse("Admin only."),
          },
        },
        post: {
          tags: ["Tenant"],
          summary: "Create a webhook",
          description:
            "Admin only. Each delivery is signed with `X-CRM-Signature`, an HMAC over the " +
            "timestamp and the body, so the receiver can tell it came from this app and was " +
            "not modified in transit — and can reject a replay by comparing the timestamp " +
            "against its own clock.\n\n" +
            "The payload carries identifiers and an actor's name, **not record data**: a " +
            "receiver fetches the record if it needs it. Delivery is fire-and-forget — a " +
            "failed attempt is recorded against the subscription and never retried, because " +
            "a third party's downtime must not fail a save.\n\n" +
            "The target must be `https`, except for `localhost` and `127.0.0.1`. It is " +
            "fetched by the server, so allowing arbitrary addresses would make this a " +
            "request forwarder.",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["label", "targetUrl"],
                  properties: {
                    label: { type: "string" },
                    targetUrl: { type: "string", format: "uri" },
                    events: {
                      type: "array",
                      items: { type: "string" },
                      description: "Empty means every event.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "The subscription. `signingSecretOneTimeSecret` is returned here.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      targetUrl: { type: "string" },
                      signingSecretOneTimeSecret: { type: "string", description: "Shown once." },
                    },
                  },
                },
              },
            },
            "400": errorResponse("Validation failed, or the target is not an acceptable URL."),
            "403": errorResponse("Admin only."),
          },
        },
      },

      "/tenant/webhooks/{id}": {
        patch: {
          tags: ["Tenant"],
          summary: "Enable or disable a webhook",
          description: "Admin only. Disabling pauses delivery without losing the configuration.",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { required: ["isActive"], properties: { isActive: { type: "boolean" } } },
              },
            },
          },
          responses: {
            "200": { description: "Updated." },
            "404": errorResponse("Not found."),
            "403": errorResponse("Admin only."),
          },
        },
        delete: {
          tags: ["Tenant"],
          summary: "Delete a webhook",
          security: bearerAuth,
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Deleted." },
            "404": errorResponse("Not found."),
            "403": errorResponse("Admin only."),
          },
        },
      },

      "/docs": {
        get: {
          tags: ["Live"],
          summary: "This reference, rendered",
          description:
            "Server-rendered and dependency-free: no build step, and nothing fetched from a " +
            "network. The reference has to work offline and behind a proxy that blocks " +
            "third-party origins, which is where a lot of this app's users are.",
          responses: {
            "200": { description: "An HTML page.", content: { "text/html": { schema: { type: "string" } } } },
          },
        },
      },

      "/openapi.json": {
        get: {
          tags: ["Live"],
          summary: "This document, as OpenAPI 3.1",
          description:
            "Unauthenticated like `/docs`, and describing endpoints rather than data: it " +
            "contains no record and no tenant. The CRM collection paths and bodies are derived " +
            "from the resource config the API validates against, and a test fails the build if " +
            "this document and the real router disagree.",
          responses: {
            "200": { description: "The OpenAPI document.", content: { "application/json": { schema: { type: "object" } } } },
          },
        },
      },

      "/health": {
        get: {
          tags: ["Live"],
          summary: "Liveness, including database reachability",
          description:
            "Reports whether the API is up **and** whether it can reach PostgreSQL, so a " +
            "deployment that started but cannot talk to its database is visibly broken rather " +
            "than silently 500ing on every request. No authentication.",
          responses: {
            "200": {
              description: "Up.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { status: { type: "string", example: "ok" }, database: { type: "string", example: "up" } },
                  },
                },
              },
            },
            "503": { description: "Up, but the database is unreachable." },
          },
        },
      },
    },

    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },

      responses: {
        AuthResponse: {
          description: "A session.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  token: { type: "string", description: "Bearer token for `Authorization`." },
                  user: { $ref: "#/components/schemas/User" },
                  organization: {
                    type: "object",
                    nullable: true,
                    properties: { id: { type: "integer" }, name: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },

      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string" },
            // Only ever field -> message, and only on a 400. On any other status
            // `details` is a small structured payload, not something to show a user.
            details: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Present on 400 only: field name to message.",
            },
          },
        },

        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            organizationId: { type: "integer" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["admin", "rep"] },
            permissions: { $ref: "#/components/schemas/Permissions" },
          },
        },

        Permissions: {
          type: "object",
          description:
            "Per-resource access. An admin's is reported as unrestricted regardless of what is " +
            "stored, because an admin bypasses this table — reporting the stored object would " +
            "mislead anything reading the response.",
          properties: {
            customers: { $ref: "#/components/schemas/PermissionSet" },
            leads: { $ref: "#/components/schemas/PermissionSet" },
            deals: { $ref: "#/components/schemas/PermissionSet" },
            reports: { $ref: "#/components/schemas/PermissionSet" },
          },
        },

        PermissionSet: {
          type: "object",
          properties: {
            view: { oneOf: [{ type: "boolean" }, { type: "string", enum: ["own", "all"] }] },
            create: { type: "boolean" },
            edit: { type: "boolean" },
            delete: { type: "boolean" },
          },
        },

        Customer: {
          type: "object",
          properties: {
            id: { type: "string", example: "c001" },
            name: { type: "string" },
            company: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            status: { type: "string", enum: ["Active", "Inactive"] },
          },
        },

        Note: {
          type: "object",
          properties: {
            id: { type: "string" },
            entityType: { type: "string", enum: ["customer", "lead", "deal"] },
            entityId: { type: "string" },
            kind: { type: "string", enum: ["note", "event"], description: "Events are server-written and not deletable." },
            body: { type: "string" },
            authorName: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        FollowUp: {
          type: "object",
          properties: {
            id: { type: "string" },
            entityType: { type: "string", enum: ["customer", "lead", "deal"] },
            entityId: { type: "string" },
            title: { type: "string" },
            type: { type: "string", enum: ["call", "email", "meeting", "task"] },
            dueAt: { type: "string", format: "date" },
            details: { type: "string" },
            status: { type: "string", enum: ["pending", "done"] },
            createdByName: { type: "string" },
          },
        },

        AuditEntry: {
          type: "object",
          properties: {
            id: { type: "string" },
            actorId: { type: "integer", nullable: true, description: "Null once the account is deleted." },
            actorName: { type: "string", description: "Survives the account, which is the point." },
            action: { type: "string", enum: ["create", "update", "delete", "convert", "permission_change", "password_change"] },
            entityType: { type: "string", enum: ["customer", "lead", "deal", "user"] },
            entityId: { type: "string" },
            entityLabel: { type: "string", nullable: true, description: "The record's name when it changed." },
            changes: {
              type: "object",
              description: "Field name to `{ from, to }`. Null on either side means absent, not blank.",
              additionalProperties: {
                type: "object",
                properties: {
                  from: { nullable: true },
                  to: { nullable: true },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  };
}