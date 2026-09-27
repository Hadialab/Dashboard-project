# CRM Dashboard API

Express + PostgreSQL REST API for the CRM dashboard, serving customers, deals,
leads, notes and follow-ups to the frontend in `../frontend`.

## Setup

```bash
npm install
cp .env.example .env
```

Then set at least `DATABASE_URL` and `JWT_SECRET` in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
npm run dev
```

Runs on http://localhost:5000.

The schema is created on boot from `src/db/schema.sql`. It is idempotent — it
only ever creates what is missing, never drops. A fresh clone against an empty
database needs no manual setup. Set `RUN_MIGRATIONS=false` to manage the schema
yourself.

**There is no seed script and no demo account.** An empty database stays empty
until someone registers, and the first account creates its own company.

## Database

One PostgreSQL database holds every tenant's data. Every row in every table
carries an `organization_id`, and the API adds that to every read and write. A
user therefore only ever sees their own company's records — the database can
host several unrelated companies without any of them seeing each other.

| Table            | Holds                                              |
| ---------------- | -------------------------------------------------- |
| `organizations`  | One row per company                                 |
| `users`          | Team members, each belonging to one organization    |
| `customers`      | Shared across the company, no owner                 |
| `leads`          | Owned by a user; unassigned records are admin-only  |
| `deals`          | Owned by a user; unassigned records are admin-only  |
| `notes`          | Activity timeline entries on a customer or deal     |
| `followups`      | Scheduled work on a customer or deal                |

Ids are text with a per-table prefix (`c001`, `l002`, `d003`, `n004`, `f005`) to
stay readable, backed by a Postgres sequence.

### `DATABASE_URL`

```
postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

If the password contains `@ / : # ?` or spaces, percent-encode them or Postgres
will parse the wrong password. `.env` is gitignored — never commit it.

## Companies and sign-up

**Every registration creates a new company, and the person registering becomes
that company's admin.** There is no shared signup pool and no way to join an
existing company, so this is what keeps tenants separate.

`POST /auth/register` requires a `organizationName`, creates the organization
and its first admin in a single transaction, and returns a token. If either
half fails, neither is written.

An admin then adds their own team from the Team page. Adding a teammate does
**not** ask for a company name — they are joining the caller's existing company,
and the API ignores any `organizationName` in that request.

Email is the login name and is unique across the whole install, so the same
address cannot register twice (including into a second company).

| Method | Path             | Notes                                        |
| ------ | ---------------- | -------------------------------------------- |
| `POST` | `/auth/register` | New company + its first admin                |
| `POST` | `/auth/login`    | `401` on bad credentials, same message either way |
| `GET`  | `/auth/me`       | Current user, for validating a token         |

## Roles and permissions

Two roles. **admin** always has full access. **Sales** (stored as `rep`) is
limited to a permissions object the admin controls per person.

Each resource has a `view` setting plus create/edit/delete:

| Setting  | Values                              | Meaning                          |
| -------- | ----------------------------------- | -------------------------------- |
| `view`   | `false`, `true`, `"own"`, `"all"`   | No access / all / own records    |
| others   | `true` / `false`                    | Whether they may do it           |

`customers` and `reports` only accept `true`/`false` for `view`, because they
have no owner to scope by. `leads` and `deals` also accept `"own"` and `"all"`.

### Defaults for a new Sales account

```json
{
  "customers": { "view": true,  "create": true,  "edit": true,  "delete": false },
  "leads":     { "view": "own", "create": true,  "edit": true,  "delete": true },
  "deals":     { "view": "own", "create": true,  "edit": true,  "delete": true },
  "reports":   { "view": false }
}
```

A working salesperson with no visibility of team-wide revenue. Change any of it
from the Team page.

### Rules

- A Sales user **owns** anything they create, so their own work is never hidden.
- A Sales user **cannot set `ownerId`**. Reassignment is admin-only, otherwise an
  `"own"` scope would be trivially bypassable.
- The owner display name (`assignedRep` / `owner`) is derived from `ownerId`, not
  accepted from the client, so the two can never disagree. The owner is always
  resolved inside the caller's own organization.
- A record with no owner is **admin-only**, so unassigned work does not leak.
- Reading a record you cannot see returns `404`, not `403`, so the API does not
  confirm that records you have no access to exist.
- A section you have no `view` permission for returns `403` on the list as well,
  rather than an empty array that would look like "no records yet".
- An action you are not permitted to do returns `403` naming the action.
- `reports` is a read-only page with no records of its own, so its permission is
  enforced in the UI. The data it aggregates is already scoped by the other three.
- Admin permissions cannot be edited (`409`) — admins are always full access.
- The last admin cannot be demoted or deleted, and you cannot delete yourself.

Permissions are normalized on every request, so a partial or tampered stored
value cannot widen access.

### Team management (admin only, own company only)

| Method   | Path                              | Notes                                 |
| -------- | --------------------------------- | ------------------------------------- |
| `GET`    | `/auth/users`                     | All users in your company             |
| `POST`   | `/auth/users`                     | Create a user; optional `permissions` |
| `PATCH`  | `/auth/users/:id/role`            | Change a role                         |
| `PATCH`  | `/auth/users/:id/permissions`     | Merge a partial permissions object    |
| `POST`   | `/auth/users/:id/permissions/reset` | Back to defaults                    |
| `DELETE` | `/auth/users/:id`                 | Remove; their records become unassigned |

All of these are scoped to `req.organizationId`, so an id from another company
is a `404` rather than a way to edit someone else's team.

`PATCH .../permissions` merges over the current set, so a partial body only
changes the keys it sends.

### Permission changes and the UI

The server re-reads the user on every request, so a permission change takes
effect on the caller's **next** request immediately. The browser caches the
session's user object, so a Sales user's interface reflects an admin's change on
their next page load. Enforcement is never delayed — only the display is.

## Command line

```bash
npm run promote                    # list every account and company
npm run promote -- you@example.com admin
npm run promote -- you@example.com rep
```

Edits the database directly, for when you cannot reach the Team page. Every
signup is an admin already, so this is only needed to change someone's role.

## Notes and follow-ups

Both hang off a customer or a deal and inherit its visibility, for the same
reason: otherwise guessing a deal id would leak its notes or its schedule.

| Method   | Path                            | Notes                              |
| -------- | ------------------------------- | ---------------------------------- |
| `GET`    | `/notes?entityType=customer&entityId=c001` | Notes on one record     |
| `POST`   | `/notes`                        |                                    |
| `DELETE` | `/notes/:id`                    | Own notes, or any as an admin      |
| `GET`    | `/followups?entityType=…&entityId=…` | Follow-ups on one record  |
| `GET`    | `/followups`                    | Everything you are allowed to see  |
| `POST`   | `/followups`                    |                                    |
| `PATCH`  | `/followups/:id`                | Reschedule, or mark done           |
| `DELETE` | `/followups/:id`                | Own follow-ups, or any as an admin |
| `POST`   | `/followups/:id/notify`         | Send the reminder email            |

Deleting a customer or a deal deletes its notes and follow-ups with it, so they
cannot outlive the thing they describe.

## Date and number handling

Two conversions that are easy to get wrong, both handled in `src/db/dates.js`
and the repo layer:

- **DATE columns are never routed through UTC.** The `pg` driver builds a `Date`
  at *local* midnight, so on a UTC+3 server an October 5th due date arrives as
  `2026-10-04T21:00Z` and `toISOString()` would report the 4th. Dates are
  formatted from local calendar components instead.
- **NUMERIC arrives as a string** (`"25000.00"`) to preserve precision for large
  money values, and is converted to a number on the way out, because the reports
  page sums `deal.value` directly and a string would concatenate.

## Email

Optional and pluggable. With no provider configured, `POST /followups/:id/notify`
answers `200` with `sent: false` and a `mailto:` link, and the UI falls back to
opening the user's own mail client. A `.ics` download and the `mailto:` link work
with no configuration at all.

## Errors

| Status | When                                                          |
| ------ | ------------------------------------------------------------- |
| `400`  | Validation failed; `details` names the offending field         |
| `401`  | Missing, invalid or expired token; or bad login                |
| `403`  | Authenticated but not permitted                                |
| `404`  | Not found, or not visible to you                               |
| `409`  | Email taken, last admin, or admin permissions are fixed        |

All JSON: `{ "error": "…", "details": { "field": "…" } }`. The frontend reads
`src/utils/apiError.js` to turn these into a single readable line.

Every route handler is wrapped in `asyncHandler` (`src/utils/asyncHandler.js`).
Express 4 only catches synchronous throws, and every handler is async because the
database is — without the wrapper a failed query becomes an unhandled rejection
that takes the whole process down.

## Query parameters

`?q=` free-text search, `?status=` / `?stage=` exact matches, `?_sort=field` or
`?_sort=-field` with optional `?_order=asc|desc`, and `?_page=` with
`?_per_page=` for a paginated envelope. Unknown sort fields are ignored rather
than throwing. See `src/utils/query.js`.

## Layout

```
src/
  app.js              express app, CORS, error handler
  server.js           boot: migrate, ping the database, listen
  config.js           env -> config, fails loudly on a missing secret
  auth/
    requireAuth.js    verifies the token, sets req.user and req.organizationId
    permissions.js    the permission model: defaults, normalize, can()
    roles.js          requireRole()
    tokens.js         sign / verify
  db/
    schema.sql        the whole schema, idempotent
    pool.js           connection pool and transaction helper
    migrate.js        runs schema.sql, plus a ping for /health
    dates.js          DATE and NUMERIC conversions
    repos/            queries, one file per group of tables
  routes/             auth, resource factory, notes, follow-ups
  validation/         server-side mirrors of the frontend schemas
  services/email.js   pluggable email provider
  utils/              query helpers, HTTP errors, asyncHandler
scripts/promote-user.js
```

## Scripts

| Command             | Does                                              |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start with file watching                          |
| `npm start`         | Start                                             |
| `npm run promote`   | Change a role from the command line               |

## Response shape

Field names are camelCase, and the mapping from Postgres is declared in
`src/db/repos/crm.js`. Two deliberate inconsistencies:

- leads and deals expose `createdDate` (the name the app has always used)
- customers expose `createdAt` (a timestamp, unused by the UI)

Aliases in SQL are double-quoted, because Postgres lowercases unquoted
identifiers — `AS ownerId` would otherwise come back as `ownerid`.
