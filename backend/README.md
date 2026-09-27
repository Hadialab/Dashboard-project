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

`JWT_SECRET` is blank in `.env.example` and the API will not start in
production without it. Generate one before deploying:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Authentication

Sign in with the seeded demo account:

```
admin@example.com / admin123
```

`POST /auth/register` and `POST /auth/login` both return a signed JWT. Send it
as `Authorization: Bearer <token>` on every other request. `/customers`,
`/deals` and `/leads` are all behind `requireAuth` and answer `401` without a
valid token — knowing the API URL is not enough to read or change anything.

| Method | Path            | Notes                                    |
| ------ | --------------- | ---------------------------------------- |
| `POST` | `/auth/register`| Returns a token; `409` if the email is taken |
| `POST` | `/auth/login`   | Returns a token; `401` on bad credentials |
| `GET`  | `/auth/me`      | Current user, for validating a token    |

Self-registration always creates a **rep**. Admins are only created from the Team
page, so nobody can promote themselves by signing up.

| Status | When                                              |
| ------ | ------------------------------------------------- |
| 400    | Validation failure or malformed JSON              |
| 401    | Missing, invalid or expired token; bad credentials |
| 404    | Unknown route or missing record                   |
| 409    | Email already registered                          |
| 500    | Unexpected server error                           |

Notes on the implementation:

- Passwords are hashed with bcrypt (cost 10) and never stored or returned in
  plaintext. No response includes the hash.
- Login returns the same message for an unknown email and a wrong password, and
  runs a bcrypt comparison either way, so it does not reveal which accounts
  exist.
- Tokens carry only the user id. Name and email are re-read per request, so a
  deleted account loses access immediately rather than at token expiry.
- Tokens are stateless, so logging out clears the client copy but cannot revoke
  an already-issued token before it expires. A blacklist is the fix if that
  matters.

## Roles and record visibility

Two roles. **admin** sees everything; **rep** is a sales rep.

| Resource            | Who can see it                                  |
| ------------------- | ----------------------------------------------- |
| `/customers`        | Everyone. Customers are shared across the team. |
| `/leads`, `/deals`  | Records where `ownerId` is the caller, plus all of them for an admin. |

- A rep **owns** anything they create, so their own work is never hidden.
- A rep cannot set `ownerId`. Reassignment is admin-only, otherwise "see only
  your own records" would be trivially bypassable.
- A record with no owner is **admin-only**. Visible to nobody else, so unassigned
  work does not leak across the team.
- Reading a record you cannot see returns `404`, not `403`, so the API does not
  confirm that records you have no access to exist.
- The display name (`assignedRep` / `owner`) is written by the server alongside
  `ownerId`, so the two can never disagree.

### Team management (admin only)

| Method   | Path                       | Notes                                        |
| -------- | -------------------------- | -------------------------------------------- |
| `GET`    | `/auth/users`              | All users, no password hashes                 |
| `POST`   | `/auth/users`              | Create a rep or another admin                 |
| `PATCH`  | `/auth/users/:id/role`     | Change a role                                 |
| `DELETE` | `/auth/users/:id`          | Remove; their records become unassigned       |

The last admin cannot be demoted or deleted (`409`), and you cannot delete your
own account, so the team page can never be locked out of.

## Notes and follow-ups

Two collections hang off a customer or a deal. Both inherit the parent's access
rules, so guessing a deal id cannot leak its timeline or schedule. Deleting a
record deletes its notes and follow-ups.

### Notes — the activity timeline

| Method   | Path       | Notes                                    |
| -------- | ---------- | ---------------------------------------- |
| `GET`    | `/notes?entityType=customer&entityId=c001` | Newest first   |
| `POST`   | `/notes`   | `{ entityType, entityId, body }`          |
| `DELETE` | `/notes/:id` | Own notes, or any if admin             |

Each note records `authorId` and `authorName` at the time it was written.

### Follow-ups — scheduled work

| Method   | Path                    | Notes                                        |
| -------- | ----------------------- | -------------------------------------------- |
| `GET`    | `/followups`            | Everything visible to the caller, due date ascending |
| `GET`    | `/followups?entityType=customer&entityId=c001` | One record          |
| `GET`    | `/followups?status=pending` | `pending` or `done`                          |
| `POST`   | `/followups`            | `{ entityType, entityId, title, type, dueAt, details }` |
| `PATCH`  | `/followups/:id`        | Reschedule, retitle, or flip `status`         |
| `DELETE` | `/followups/:id`        | Own follow-ups, or any if admin               |
| `POST`   | `/followups/:id/notify` | Send the reminder email                      |

`type` is one of `call`, `email`, `meeting`, `task`. Marking a follow-up done
stamps `completedAt`; reopening clears it.

### Email

`POST /followups/:id/notify` returns `{ sent, reason, mailto, providerConfigured }`.

With no provider configured it returns `sent: false` and a `mailto:` link rather
than an error, and the frontend opens the user's own mail client. Set
`EMAIL_API_KEY` and `EMAIL_FROM` to send server-side through Resend:

```
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_...
EMAIL_FROM="CRM <crm@yourdomain.com>"
```

A deal has no contact email of its own — it references a customer by name — so a
deal follow-up reports that rather than guessing a recipient.

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
  app.js                 express app, CORS, error handling, route wiring
  config.js              env config; fails fast on a missing JWT secret
  auth/
    requireAuth.js       route guard for the data endpoints
    roles.js             role checks and the admin-only gate
    tokens.js            sign, verify, and extract bearer tokens
  routes/
    auth.routes.js       register, login, me, and admin team management
    notes.routes.js      activity timeline, scoped to the parent record
    followUps.routes.js  scheduled work and reminder email
    factory.js           CRUD routes shared by all three collections
  validation/
    userSchema.js        registration and login rules
    noteSchema.js        note rules and the entity map
    followUpSchema.js    follow-up rules
    resources.js         per-collection fields, search fields, validators, access rules
  services/
    email.js             pluggable email sender; no-op without an API key
  db/
    store.js             read/write helpers (swap these for MongoDB)
    seed.js              writes data/db.json on first run, seeds the demo user
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
- Customers are shared; scoping applies to leads and deals. See
  [Roles and record visibility](#roles-and-record-visibility).
- Tokens do not expire early on logout; see the auth notes above.
