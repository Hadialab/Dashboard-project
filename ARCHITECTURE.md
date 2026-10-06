# Architecture

How this CRM is put together, and why. For endpoints, query parameters and
response shapes see [`backend/README.md`](backend/README.md); for UI structure see
[`frontend/README.md`](frontend/README.md).

- [The shape of it](#the-shape-of-it)
- [Auth and permissions](#auth-and-permissions)
- [The data model](#the-data-model)
- [Multi-tenancy](#multi-tenancy)
- [Frontend layering](#frontend-layering)
- [Error handling](#error-handling)
- [Configuration](#configuration)
- [Folder conventions](#folder-conventions)
- [Testing](#testing)
- [Known limitations](#known-limitations)

## The shape of it

Two deployable units and one database.

```
┌─────────────────────┐        ┌──────────────────────┐       ┌──────────────┐
│  frontend/          │  HTTPS │  backend/            │  SQL  │ PostgreSQL   │
│  React 19 + Vite    │───────▶│  Express             │──────▶│              │
│  static files       │  JWT   │  JWT auth, per-org   │       │ one database │
│  served by nginx    │        │  queries, validation │       │ many tenants │
└─────────────────────┘        └──────────────────────┘       └──────────────┘
     browser                       stateless
```

They are separate because they have genuinely different lifetimes. The front end
is a static bundle that can be cached hard and scaled to zero; the API holds
connections to the database and cannot. Merging them into one server would mean
either re-shipping the bundle on every API change or giving up both.

The API is stateless — no sessions in memory, no sticky routing needed. The only
thing tying a request to a user is a signed JWT, which is why a deploy can
replace every API instance without logging anyone out.

### Why JWT, and what it costs

A session cookie would be simpler and safer (see
[Known limitations](#known-limitations) for the two things it makes easy). JWT was
chosen because the API is stateless and can scale horizontally with no shared
store. The trade-offs are documented rather than hidden:

- **Logout cannot revoke a token.** Clearing it client-side ends the session in
  that browser; a captured token is valid until it expires. Bounded by
  `JWT_EXPIRES_IN`, which is 12 hours by default.
- **A permission change does not invalidate a token**, so the expiry matters.
  Mitigated as far as it can be: the user is re-read from the database on every
  request rather than trusted from the token's claims, so a change takes effect
  immediately even though the token itself stays valid.

## Auth and permissions

Sign-in is enforced by the API. The UI hides controls it would reject, but that is
a convenience, not the mechanism — every one of those routes checks independently.

```
request ──▶ requireAuth ──▶ permission gate ──▶ organization filter ──▶ handler
             │                   │                      │
          JWT valid?        can this role do        only rows belonging
          user still        this, on this            to the user's org
          exists?           record?
```

Three layers, each of which has to be bypassed for a cross-tenant read to happen.

**1. `requireAuth`** ([`backend/src/auth/requireAuth.js`](backend/src/auth/requireAuth.js))
verifies the signature and expiry, then **re-reads the user row**. Not from the
token's claims — from the database. A user deleted ten minutes ago does not get
ten more minutes of access because a token somewhere still says they exist.

**2. The permission gate** ([`backend/src/auth/permissions.js`](backend/src/auth/permissions.js))
answers "may this role do this to this record?" from three inputs:

| Input             | Where it comes from                          |
| ----------------- | -------------------------------------------- |
| the user's `role` | `users.role` — `admin` or `rep`             |
| their `permissions` | `users.permissions`, a JSONB object         |
| the record's owner | `owner_id`, so "my own records" is decidable |

Admins hold `UNRESTRICTED_PERMISSIONS` — everything, unconditionally. This was a
bug once: an admin's empty `permissions` object read as "restricted" and the UI
locked its own administrator out of the Team page.

A rep's permissions are per resource (`customers`, `leads`, `deals`, `reports`):

```jsonc
{
  "customers": { "view": "own", "create": true, "edit": "own", "delete": false },
  "leads":     { "view": "all",  "create": true, "edit": "all",  "delete": false }
}
```

`view` and `edit` take `own` or `all`, or are absent for no access. `create` and
`delete` are booleans. **Absent means denied** — there is no default-allow, because
a permission system that fails open is a permission system that fails.

**3. The organization filter.** Every query carries `organization_id = ?`. This
is the layer that makes one database safe for several companies, and it is
applied in the repository layer rather than in each handler, so a new endpoint
gets it by default. A handler that bypasses it is a bug, not a design choice.

### Frontend mirrors it, and is allowed to be wrong

[`ProtectedRoute`](frontend/src/routes/ProtectedRoute.jsx) checks the same
permission before rendering a route. If it disagrees with the API the user sees a
403 page for something that would have worked; the reverse — the UI allowing it
and the API rejecting — is the safe direction. The UI never sees the permission
gate as an authorisation decision.

## The data model

Seven tables. `organizations` is the tenant; everything else belongs to one and
cascades from it.

```
organizations
   │
   ├── users            who can sign in, and what they may do
   ├── customers        the people and companies you sell to
   ├── leads            unqualified contacts, before they become customers
   ├── deals            revenue, moving through a pipeline
   ├── notes            activity timeline, hanging off any of the three
   ├── followups        what is still to do, hanging off any of the three
   └── audit_log        who changed what, with before and after values
```

Full column-level detail is in [`backend/src/db/schema.sql`](backend/src/db/schema.sql).
The decisions in it that are not obvious:

**Ids are `TEXT`, not the `SERIAL` used elsewhere.** Customers, leads and deals
carry human-readable ids like `c041`. They are generated from a per-organization
sequence so two companies can both have a `c001` without colliding — the id is
shown to users and pasted into support conversations, and `37` means nothing to
anyone reading a bug report, while `c041` is recognisable.

**`owner_id` and `assigned_rep`/`owner` both exist.** The id is the relationship;
the name is a denormalised copy for display. The server writes both on every
change so they cannot drift. `NULL` owner means unassigned, which only an admin
can see or change.

**Leads are never deleted on conversion.** `converted_customer_id` is set and the
row stays, which is what makes a second conversion detectable — the API answers
`409`, and refuses to move a converted lead back off `Converted`. Deleting the row
would have made both of those impossible.

**`created_at` is `DATE` on leads and deals, `TIMESTAMPTZ` on everything else.**
Leads and deals are exposed as `createdDate`, a plain calendar day, because that is
what the UI shows and what a salesperson means by "created". Users and activity
genuinely need a time. The API converts at the boundary; the UI never sees a
`Date` object for these.

**`notes.kind` is `note` or `event`.** Events are written by the server when a
record is created or a tracked field changes, so a timeline is not a blank page
until someone types something. Events are part of the record's history and cannot
be deleted; notes can.

**Amounts are `NUMERIC(14,2)`,** never a float. Money in binary floating point
loses cents, and a CRM whose totals are off by a few cents is a CRM nobody trusts.
It arrives in the API as a number and leaves as a string where precision matters.

**`followups.due_at` is `DATE`.** A follow-up is due on a day, not at an instant.
`completed_at` is `TIMESTAMPTZ`, because *when* it was actually ticked off is a
real event worth keeping.

**`audit_log` is separate from `notes`, though the two are shown together.** They
have different jobs and different lifetimes. `notes` is prose on one record's
timeline, written for someone reading it, and a user can delete their own.
`audit_log` is a machine-queryable record of every mutation — before and after
values rather than a sentence — is append-only, and is readable only by an admin.
An audit trail a user can delete is not one, and one that stores a sentence cannot
answer "who changed this email address, and what was it before", which is the
question it exists to answer. There is no `DELETE` route for it anywhere in the
API: rows leave only when the organization is deleted, which cascades.

It records every field that actually changed, not only the handful the timeline
narrates. Recording a subset would silently omit a changed email address or phone
number, which is exactly the kind of change an audit log is consulted about, and a
log that answers "nothing changed" when something did is worse than no log. The
cost is a wider `JSONB` payload on a row-per-mutation table, which is not a trade
worth making.

Three columns are denormalised on purpose: `actor_name`, `entity_label` and
`changes`. `actor_id` and the record's own row both go away — the first on
`ON DELETE SET NULL`, the second when the record is deleted — so a log that read
its labels from live tables would lose precisely the entries that matter most: the
one recording a deletion. `entity_label` is read from the resource's declared
`labelField`, because a customer is `name` and a deal is `title`.

The date filter is pinned to **UTC**. `created_at` is `TIMESTAMPTZ`, so casting a
bound to `date` would make Postgres interpret it in the server's timezone — and a
server three hours ahead of UTC would then silently exclude the last three hours of
yesterday from a "today" range.

## Multi-tenancy

One database, many companies, no way to see across.

Every table carries `organization_id` with `ON DELETE CASCADE`, so deleting a
company removes its data rather than orphaning it. Every query filters on it.

This is enforced structurally rather than by discipline. Repositories take an
`organizationId` as a required argument, so a query that forgets to filter does not
compile — there is no way to write `SELECT * FROM customers` and get everyone's
rows, because the function signature will not accept the call.

```
                        ┌──────────────────┐
  request ──▶ requireAuth│  user.organization_id
                        └────────┬─────────┘
                                 │  carried down, never re-derived
                                 ▼
                        ┌──────────────────┐
                        │  repository      │  WHERE organization_id = $n
                        └──────────────────┘
```

The org id comes from the *authenticated user*, never from the request body or a
query parameter. A client that could name its own org would be naming whose data it
wants. That single rule is what makes the whole thing safe.

## Frontend layering

Four layers, each depending only on the one below it.

```
pages/            route-level screens, own the data fetching
   ↓
components/      presentation; reusable across pages
   ↓
services/        one function per API endpoint, returns typed data
   ↓
api/axios.js     the single axios instance: base URL, token, retry, 401
```

**`api/axios.ts` is the only place that knows about HTTP.** It holds the base URL,
attaches the bearer token, retries idempotent requests through a transient
failure, and clears the token and announces a `401` so the app can fall back to
the login screen. Nothing above it sets a header or reads a status code.

The retry is aimed at cold starts: a free-tier host that has spun down drops the
first request while it boots. Only `GET`/`HEAD`/`OPTIONS` are retried — replaying
a `POST` could create a duplicate record, and a duplicate customer is worse than a
failed save.

**Services return data, not responses.** A service unwraps `response.data` and
throws on failure, so a component never sees an axios response object and there is
no `.data.data` anywhere in a page.

**Pages own their fetching.** No global data layer. With a dozen screens, a cache
with invalidation rules is a second thing to get wrong and buys little; a page
that loads on mount and refetches on mutation is obvious to read and to test.

**`store/` is UI state only** — the auth session, the theme, the sidebar. Anything
that lives in the database does not live here. That is what keeps a stale store
from becoming a stale record.

**Types live in `src/types`**, and the enums are declared once there as `as const`
and re-exported by `utils/crmConstants`. A pipeline stage is written in exactly
one place, which is also where its type is derived from, so a stage cannot exist
in the type but not the list.

## Error handling

One normalised shape for every failure, so callers branch on a kind rather than
sniffing at a message string. Defined in
[`frontend/src/utils/apiError.ts`](frontend/src/utils/apiError.ts):

```ts
{ kind, message, status?, fieldErrors?, retryable, original }
```

`kind` is one of `network`, `api`, `auth`, `forbidden`, `conflict`, `validation`,
`server`, `unknown`. The UI reacts to the kind — an auth failure logs out, a
conflict offers a refresh, a validation failure highlights fields — and `message`
is the only part shown to a user.

Two details that are easy to get wrong, and were:

**`details` is only a message map on a `400`.** On any other status it is a
structured payload. A `409` returns `{ details: { customerId: "c041" } }`, and
reading that without checking the status rendered a bare `c041` as the error
message. Checking that the values were strings is not enough — `"c041"` is a
string. Only the status code distinguishes a validation map from a payload.

**A network failure is not retryable.** The connection did not happen, so an
identical second attempt will not succeed either. Telling someone to retry is how
they end up clicking through a wall of failures.

Two boundaries catch render-time crashes:
[`ErrorBoundary.tsx`](frontend/src/components/ErrorBoundary.tsx) wraps the whole
app, and a second one inside the layout wraps each page. The inner one is why a
crashing page leaves the sidebar working — the user can navigate somewhere that is
not broken instead of reloading onto the same one.

Error tracking ([`services/errorTracking.ts`](frontend/src/services/errorTracking.ts))
is off unless `VITE_SENTRY_DSN` is set, so development and CI send nothing
anywhere and need no account. It scrubs request and response bodies, the auth
header, and anything typed into a form before sending: a CRM holds names, emails
and phone numbers, and an error report that quietly includes a customer's email is
a data leak with a friendly dashboard.

## Configuration

**Frontend — `VITE_*`, inlined at build time.**

This is the detail that governs deployment: a `VITE_` value is baked into the
bundle by the build and cannot be changed afterwards by anything the server says.
A staging bundle and a production bundle are therefore two different artifacts, not
one artifact with a runtime switch. The CI passes the API URL as a build argument
for exactly this reason.

| File                     | Mode          | Used by                       |
| ------------------------ | ------------- | ----------------------------- |
| `.env.development`       | `npm run dev`| local work                    |
| `.env.staging`           | `npm run build:staging` | staging builds        |
| `.env.production`        | `npm run build` | production builds           |
| `.env.local`             | any           | your machine; gitignored, wins over the above |

Validation lives in
[`frontend/src/envValidation.ts`](frontend/src/envValidation.ts) and runs in
`vite.config.js`, **before a build starts**. A build with no API URL, a malformed
URL, `http` in production, or a leftover `example.com` placeholder fails rather
than shipping. That check is tested by a CI step which asserts the build *fails* —
a guard nobody exercises is a guard that quietly stops guarding, which is how the
first version of it ended up in the browser bundle where nothing could trip it.

**Backend — plain environment variables, read at run time.** Secrets are read
here and never in the front end: `DATABASE_URL`, `JWT_SECRET`. A `VITE_` prefix
would put them in a file anyone can download.

## Folder conventions

```
frontend/src/
  api/          the axios instance — the only place that knows about HTTP
  components/   ui/ shared primitives; one folder per feature area otherwise
  hooks/        data fetching and reusable behaviour
  pages/        one file per route, lazy-loaded
  routes/       route guards
  services/     one function per API endpoint
  store/        UI state only, never server data
  types/        the domain model; enums declared once
  utils/        pure functions, no React
  validation/  shared Yup schemas
  test/         setup, harness, and every test file

backend/src/
  auth/         tokens, requireAuth, the permission rules
  db/           pool, migrations, schema.sql, repos/
  routes/       one file per resource, built from a shared factory
  services/     work that is not a request or a query (email)
  utils/        httpError, asyncHandler, query parsing
  validation/   Yup schemas, one per resource
```

A few conventions that are load-bearing rather than decorative:

**`utils/` is pure.** No React, no network, no clock unless it is injected. This is
what makes `reportAnalytics` and the exporters straightforwardly testable.

**Repos take `organizationId` as a required argument.** The tenant filter cannot
be forgotten because it cannot be omitted.

**Route files are built from a factory.** `routes/factory.js` applies the auth,
the permission check, the org scoping and the error shape once, so a new endpoint
declares its rules instead of re-implementing them.

**Pages are lazy-loaded** behind `Suspense`. The login page should not download
the reporting library.

## Testing

Four layers, each catching what the one above cannot.

**API unit** (`npm test` in `backend/`) — pure logic against no database, in a
plain Node environment. Separate from the frontend suite on purpose: it is a
different process with different assumptions, and the frontend's coverage gate is
scoped to its own layers, so folding these in would dilute it. Deliberately does
*not* cover the route and repo layers — those need a real database and a running
app, which is what the Playwright suite already exercises end to end. Testing them
again with a mocked pool would assert that the mocks behave, not that the API
does.

**Unit** (`npm test`) — services, utils, stores and hooks in isolation, with the
service layer mocked. No database, no API, under half a minute. Run on every save.

**Integration** (`npm test`) — real components in jsdom, real stores, mocked
services. Customer CRUD, lead conversion, pipeline moves, permission-gated
blocking. This is where a component wired to the wrong store gets caught; a unit
test of the component alone would pass.

**End-to-end** (`npm run test:e2e`) — Playwright against the real API and a real
database, in a real browser. Login, add a customer, convert a lead, drag a deal
across the board, bulk CSV import, and a mutation made through the UI appearing in
the audit log with its before and after values.

The split matters: the fast layers make it cheap to change anything, and the slow
layer is what stops a cheap change from breaking a signup.

**Coverage is gated in CI** at 80% lines and functions, 75% branches, scoped to
`src/services`, `src/utils`, `src/store` and `src/hooks` — the layers where a
regression costs something. Component files are excluded, because a coverage
number earned by covering prop plumbing is a number that stops meaning anything.
Enforced by Vitest, so it cannot be removed without editing a config file.

E2E runs on its own ports (5001, 5174) against its own `crm_e2e` database,
resolved from `backend/.env` by swapping the database name. It cannot collide with
a running dev server and cannot write to the database you are working in.

**A green local suite is not a green CI suite, and the gap is worth stating.**
Two of the failures that had to be diagnosed here were invisible locally: two E2E
helpers that waited for a dialog to close rather than for a row to arrive, and a
Node version that no dependency would admit to needing. Both pass on a developer
machine and fail on a cold runner. The lesson generalises — a test that passes
because the machine is fast is not a test that passes.

### What CI asserts, in order

The order is the point. Each step catches a class of failure that the next one
would report in a way nobody can act on.

1. **Every direct dependency's `engines` supports this Node.** Because `engines`
   is advisory, `npm ci` will happily install a package that cannot run here, and
   the symptom arrives later as an unexplained error inside another tool's
   unhandled-errors section.
2. **Lint**, then the API's own tests, then the unit and integration tests, then
   coverage against its thresholds.
3. **A production build and a staging build**, plus an inverted step asserting
   that a publish build with a placeholder API URL is *refused*.

The test step re-emits the tail of its own log as an annotation. Vitest's reporter
annotates failing tests; it has nothing to say about a worker that failed to
start, which is not a failing test. Without that, the most confusing failure
observed here presented as a bare `exit code 1` that named no test and pointed at
nothing.

## Known limitations

Real gaps, not a to-do list. Each would change the design above rather than sit
alongside it.

**Logout does not revoke an issued token.** Stateless JWTs cannot be revoked
without a server-side deny list. Bounded by `JWT_EXPIRES_IN`.

**Deals store a customer name, not a customer id.** So a deal follow-up has no
email address of its own and sends from the linked customer. Changing it means
adding `customer_id` to `deals` and migrating existing rows.

**No password reset.** An admin can reset by removing and re-adding a team
member. Self-service needs an email provider.

**The audit log is never pruned.** Retention is deliberately not implemented: a log
that quietly discards its oldest rows stops being evidence, so that belongs in a
scheduled job or an operator's decision rather than a default. A long-lived install
will grow the table indefinitely.

**Audit entries are written after the business write commits, and a failed write
is logged rather than raised.** Failing the request would report a change that did
happen as an error. The consequence is that an audit write can fail silently apart
from the server log — the log's own integrity is not verified against the
records it describes.

**The log is only as good as its capture points.** Every customer, lead and deal
mutation passes through `routes/factory.js`, so those are covered by
construction. A write that bypasses it — a direct SQL fix, or a future script run
outside the API — leaves no trace.

**The browser test run drives system Chrome.** Playwright's pinned Chromium could
not be downloaded on the development machine. CI uses the pinned build, so the
suite is verified there.

**HTML5 drag-and-drop on the pipeline board is verified with synthetic events.**
The board's `dragstart` handler calls `dataTransfer.setData`, and a synthesised
pointer drag does not reliably supply one. The per-card stage `<select>` is the
path a keyboard or a screen reader actually uses, and it is exercised directly.
