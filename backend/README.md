# CRM Dashboard API

Express REST API for the CRM dashboard, serving customers, deals and leads to
the frontend in `../frontend`.

Replaces the `json-server` mock the frontend previously pointed at, and is
response-compatible with it — see [Compatibility](#compatibility).

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Runs on http://localhost:5000. `data/db.json` is created from the seed data on
first start, so there is nothing else to set up.

## Scripts

| Script        | Purpose                                    |
| ------------- | ------------------------------------------ |
| `npm run dev` | Start with auto-reload (`node --watch`)    |
| `npm start`   | Start normally                             |
| `npm run seed`| Rewrite `data/db.json` from the seed data, discarding local changes |

## Endpoints

Full CRUD on three collections:

| Method   | Path                  |
| -------- | --------------------- |
| `GET`    | `/customers`          |
| `POST`   | `/customers`          |
| `GET`    | `/customers/:id`      |
| `PUT`    | `/customers/:id`      |
| `DELETE` | `/customers/:id`      |

`/deals` and `/leads` expose the same set. `GET /health` is a liveness check.

### List query parameters

| Param        | Example          | Notes                                        |
| ------------ | ---------------- | -------------------------------------------- |
| `_page`      | `_page=2`        | 1-based page number                          |
| `_per_page`  | `_per_page=25`   | Page size, default 10                        |
| `_sort`      | `_sort=-name`    | Prefix with `-` for descending               |
| `q`          | `q=cedar`        | Case-insensitive search across key fields    |
| any field    | `status=Active`  | Exact-match filter, e.g. `stage=Won`         |

Filter, search and sort all compose, and apply before pagination.

### Response shapes

`GET /customers` returns a **bare array** by default, but a **pagination
envelope** when `_page` or `_per_page` is present:

```json
{ "first": 1, "prev": null, "next": 2, "last": 7, "pages": 7, "items": 20, "data": [] }
```

`items` is the total matching the filter, not the page length. This mirrors
json-server, and the frontend relies on it: `Customers.jsx` reads
`.data`/`.pages`/`.items`, while the deals, leads and reports callers expect a
plain array. Handle both when adding new callers.

### IDs

Server-generated and sequential, continuing the seeded format: `c020` → `c021`,
`d020` → `d021`, `l020` → `l021`. Client-supplied `id` values are ignored, as is
`createdDate` on deals and leads.

### Errors

`{ "error": "message", "details": { "field": "why" } }`

| Status | When                                            |
| ------ | ----------------------------------------------- |
| 400    | Validation failure or malformed JSON            |
| 404    | Unknown route or missing record                 |
| 500    | Unexpected server error                         |

Validation mirrors the frontend Yup schemas. Errors are also caught client-side
first, so the API checks are a backstop rather than the primary UX.

## Compatibility with json-server

Response shapes and query semantics match, with two deliberate differences:

- **`q` now filters.** json-server ignored `q`, so the customers search box
  silently returned unfiltered results. Searching now works.
- **Operator-style filters are ignored.** Express parses `?status[$gt]=x` into
  an object; non-scalar filter values are skipped rather than stringified.

Everything else — bare array vs. envelope, `items` semantics, `-field` sorting,
`c###` id format, `{ "error": "Not Found" }` on 404 — is unchanged.

## Layout

```
src/
  server.js              entry point
  app.js                 express app, CORS, error handling
  routes/factory.js      CRUD routes shared by all three collections
  validation/resources.js  per-collection fields, search fields, validators
  db/
    store.js             read/write helpers (swap these for MongoDB)
    seed.js              writes data/db.json on first run
    seedData.js          the seed rows
  utils/
    query.js             filter, search, sort, paginate
    httpError.js         HttpError + helpers
```

## Storage

Rows live in `data/db.json`, cached in memory and flushed on every write (via a
temp file and rename, so an interrupted write cannot corrupt it).

To move to MongoDB, replace the read/write helpers in `src/db/store.js` with
Mongoose calls. The route handlers, validation and query helpers stay as they
are, so nothing else needs to change.

## Notes

- CORS is restricted to `CORS_ORIGIN` (default `http://localhost:5173`).
- There is **no authentication**. Login and register are client-side only, and
  every endpoint is open to anyone who can reach the API. Fine for local
  development; add auth before exposing this anywhere public.
