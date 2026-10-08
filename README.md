# CRM Dashboard

A multi-tenant CRM for small sales teams: track customers, leads, deals and
follow-ups, with a pipeline board, reporting and per-person permissions.

React front end, Express + PostgreSQL API, one repo.

[![CI](https://github.com/Hadialab/Dashboard-project/actions/workflows/ci.yml/badge.svg)](https://github.com/Hadialab/Dashboard-project/actions/workflows/ci.yml)
[![E2E](https://github.com/Hadialab/Dashboard-project/actions/workflows/ci.yml/badge.svg?job=e2e)](https://github.com/Hadialab/Dashboard-project/actions/workflows/ci.yml)
![Types](https://img.shields.io/badge/TypeScript-strictNullChecks-22c55e)
![Tests](https://img.shields.io/badge/tests-426%20passing-22c55e)
![E2E](https://img.shields.io/badge/e2e-43%20specs-0ea5e9)
![Coverage](https://img.shields.io/badge/coverage-93%25-0ea5e9)

## Screenshots

> Screenshots are generated from the app in `docs/screenshots/`. Regenerate them
> with `npm run screenshots` in `frontend/` (needs a running app and a Chrome
> install).

| Pipeline | Customers |
| -------- | --------- |
| ![The pipeline board: six stage columns, deals as cards, drag to move between stages](docs/screenshots/pipeline.png) | ![The customer table with filters and per-row actions](docs/screenshots/customers.png) |

| Dashboard | Reports |
| --------- | ------- |
| ![Dashboard: revenue stat tiles, a funnel chart, and recent activity](docs/screenshots/dashboard.png) | ![Reports: revenue by stage, win rate, and export to CSV or PDF](docs/screenshots/reports.png) |

## What it does

- **Customers** — table with search, filters and sorting; create, edit, archive;
  bulk select and act; CSV import and export. Each has a detail view with an
  activity timeline, notes and scheduled follow-ups.
- **Leads** — capture, qualify, assign, and convert to a customer in one action.
  A converted lead stays on the list, marked, and cannot be converted twice.
- **Deals** — value, expected close date, owner and stage. Move them by dragging
  on the pipeline board or with the stage selector on the card.
- **Pipeline** — six stages from `Lead` to `Won`, with per-stage totals and a
  horizontal scroll on narrow screens rather than a squashed board.
- **Reports** — revenue by stage, conversion funnel, win rate, and per-rep
  performance. Export any view to CSV or PDF.
- **Dashboard** — revenue tiles, the funnel, stale-lead warnings and recent
  activity.
- **Follow-ups** — everything due across customers, leads and deals, grouped by
  overdue / today / upcoming.
- **Team** — admins add and remove people and set exactly what each of them can
  do, per resource.
- **Password reset** — self-service, by emailed link. The link works once and
  expires in 15 minutes.
- **Email** — welcome mail, and reminders you can send from any follow-up. Needs a
  provider configured; without one, the app is unchanged and the reminder button
  opens your own mail client instead.
- **Audit log** — admins see every change to a customer, lead, deal, someone's
  access, or a password, with the before and after value of each changed field.
  Append-only, and filterable by person, record, action and date.
- **Company** — admins set the company profile, create scoped **API keys** for
  scripts, and register **webhooks** that POST a signed notification when something
  changes.
- **Live updates** — changes made by colleagues appear without a refresh, over
  Server-Sent Events.

## API

- `GET /docs` — a rendered reference, generated from the app itself.
- `GET /openapi.json` — the same thing as an OpenAPI 3.1 document.

Both need no token. A test walks the real router and fails the build if the
document and the code disagree, so they cannot go stale.
- **Profile and settings** — your own details, password, light and dark theme.

Everything is scoped to a company. One database serves many, and no company can
see another's records.

## Requirements

- **Node 22.22.2 or newer.** Not a preference: jsdom 30 — which the unit and
  integration tests run in — declares `engines: ^22.22.2 || ^24.15.0 || >=26.0.0`
  and does not support Node 20 at all. npm will install it anyway, because
  `engines` is advisory, and then every test file fails the moment its worker
  starts, with a `webidl.util.markAsUncloneable is not a function` error that
  reads like a jsdom bug rather than a runtime mismatch. CI asserts every direct
  dependency's `engines` against the running Node before anything else runs, so
  this fails at the top of the build instead of 200 lines into a log.
- **PostgreSQL 14 or newer**, reachable from the API

`frontend/.nvmrc` records the same floor, and Node 24 works too — it is what the
code is developed against.

## Running it

Two terminals. The API on 5000, the UI on 5173.

### 1. Create an empty database

```sql
CREATE DATABASE crm;
```

The schema is created automatically on first boot, from
`backend/src/db/schema.sql`. Nothing else to run.

### 2. The API

```bash
cd backend
npm install
cp .env.example .env
```

Set at least these in `backend/.env`:

```ini
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/crm
JWT_SECRET=<a long random string>
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then:

```bash
npm run dev
```

`http://localhost:5000/health` reports both the API and the database, so a
misconfigured connection shows up there rather than as a failed request later.

### 3. The UI

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and **register**.

There is no demo account and no seed data — an empty database stays empty until
someone signs up, and the first account creates its own company. Each test in the
E2E suite registers its own throwaway company, so there is nothing to reset.

### Demo data

If you want data to look at:

```bash
cd backend
npm run seed:demo -- you@example.com
```

That fills the named account's company with date-relative customers, leads, deals
and follow-ups. `-- --force` replaces what is there.

## Companies and roles

**Every sign-up creates a new company, and the person signing up becomes its
admin.** There is no shared signup pool and no way to join an existing company.
That is what lets one database serve several unrelated businesses — every row
carries an `organization_id`, and the API filters on it for every read and write.

An **admin** has full access and manages their own team. A **sales rep** has
per-person access: for each of customers, leads, deals and reports, the admin
chooses whether they can view it — nothing, only their own records, or everything —
plus whether they can create, edit and delete.

The API enforces all of this. The UI hides controls it would reject, which is a
convenience, not the mechanism.

## Tech stack

**Frontend** — React 19, Vite 8, Tailwind CSS 4, React Router 7, Zustand, Axios,
Recharts, Yup, jsPDF, Papa Parse, lucide-react, Sentry.
**Backend** — Express 5, PostgreSQL (`pg`), `jsonwebtoken`, `bcryptjs`, Yup, CORS.
**Tooling** — Vitest and Testing Library for unit and integration, Playwright for
end-to-end, oxlint, TypeScript 7, GitHub Actions. Node 22.22.2 or newer; see
[Requirements](#requirements).

The frontend is fully TypeScript. `strictNullChecks` is on, and the type check
runs in CI on three configurations, because one is not enough: the shipped config
catches mismatches, and two stricter ones catch what it cannot — a prop or callback
parameter left implicit, and anything wrong in the test tree, which the shipped
config excludes outright.

## Scripts

Run from `frontend/` unless noted.

| Command                  | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `npm run dev`            | UI on 5173                                                   |
| `npm run build`          | production bundle into `dist/`                               |
| `npm run build:staging`  | staging bundle — picks up `.env.staging`                     |
| `npm run preview`        | serve the built bundle                                       |
| `npm run lint`           | oxlint                                                       |
| `npm run typecheck`      | `tsc --noEmit` over the app                                  |
| `npm run typecheck:strict` | as above plus `noImplicitAny`, which catches an untyped prop or callback parameter — invisible to the shipped config |
| `npm run typecheck:tests`  | `noImplicitAny` over `src/test`, which `tsconfig.json` excludes |
| `npm test`               | unit + integration, no database or API needed                |
| `npm run test:watch`     | the same, in watch mode                                      |
| `npm run test:ui`        | Vitest's interactive UI                                      |
| `npm run coverage`       | tests + a coverage report and an enforced threshold          |
| `npm run test:e2e`       | Playwright, full stack, real database                        |
| `npm run test:e2e:ui`    | Playwright's interactive UI                                  |
| `npm run test:e2e:reset` | drop and recreate the `crm_e2e` database                     |
| `npm run test:all`       | unit, integration and end-to-end in one go                   |

Backend: `npm run dev` (with `--watch`), `npm start`, `npm run seed:demo`.

## Testing

**426 frontend tests** across 23 files, **108 backend unit tests** across 8, and
**43 end-to-end specs**.

```bash
cd frontend
npm test            # unit + integration
npm run coverage    # the same, with the coverage gate enforced
npm run test:e2e    # full stack, real browser, real database
```

`npm test` needs no database and no running API — every test mocks the service
layer, so it runs anywhere in about 20 seconds. The integration tests render real
components against real stores with mocked services, which is what catches a
component wired to the wrong store; a unit test of the component alone would pass
regardless.

`npm run test:e2e` needs PostgreSQL. It starts **its own** API on port 5001 and
preview server on 5174, pointed at a separate `crm_e2e` database resolved from
`backend/.env` by swapping the database name. It never collides with a dev server
on 5000/5173 and never writes to the database you are working in. Each spec
registers its own company, so there is no fixture to clean up between runs.

```bash
npm run test:e2e:reset   # clean slate; refuses to run unless the URL names crm_e2e
```

By default the E2E run drives the Chrome already installed on the machine, so
there is nothing to download. Set `E2E_BROWSER=chromium` for Playwright's pinned
build, which is what CI uses.

Coverage is gated in CI at 80% lines and functions and 75% branches, scoped to
`services`, `utils`, `store` and `hooks` — the layers where a regression costs
something. Components are excluded on purpose: a number earned by covering prop
plumbing is a number that stops meaning anything. Current coverage across those
layers is 93% of lines and 84% of branches. The threshold lives in
`vite.config.js` and is enforced by Vitest, so it cannot be quietly removed.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull
request to `main` and `dev`. Both jobs fail the workflow on error.

- **Lint, test and build** — checks that every dependency's `engines` supports the
  running Node, then oxlint, three typecheck passes, Vitest with the coverage gate,
  a production build and a staging build. No database needed.
- **End-to-end** — the full stack against a throwaway PostgreSQL 16, with the
  Playwright report and failure traces uploaded as artefacts.

Two steps exist because of failures that were hard to read rather than hard to
fix. The `engines` check names the dependency that does not support the runtime
before a test runs, instead of surfacing it as an unexplained `webidl` error
inside Vitest's unhandled-errors section. And the test step re-emits the tail of
its log as an annotation, because a failure that is not a failing test — a worker
that never started — produces no annotation from Vitest at all, and a bare "exit
code 1" that names no test and points at nothing is not a usable error.

**Three typecheck passes, because one was not enough.** The shipped config catches
type mismatches but not *missing* types — a component whose props are entirely
untyped passes it cleanly. That is not theoretical: turning `noImplicitAny` on for
the first time reported 47 errors in files that had already been converted and
already passed. The third pass exists because `tsconfig.json` excludes `src/test`
outright, and that exclusion had been hiding 28 more in three test files. Each pass
has proved its worth by failing on a mutation that the previous one passed.

One step is deliberately inverted: it asserts that a publish build with a
placeholder API URL **fails**. A configuration guard that is never exercised is a
guard that quietly stops guarding.

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and pushes
both images on a merge to `main`. Production deploys are a manual dispatch rather
than a push, so a bad build is found in staging rather than by a customer.

## Deployment

Both services containerise:

```bash
docker build -t crm-api  ./backend
docker build -t crm-app  ./frontend \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  --build-arg VITE_APP_VERSION=$(git rev-parse --short HEAD)
```

The API image runs as a non-root user and health-checks on `/health`. The app
image is nginx serving the built bundle with the SPA fallback that client-side
routing needs.

**`VITE_` values are inlined at build time.** The API URL is fixed by the build
and cannot be changed by anything the server says afterwards — so staging and
production are two separate artifacts, not one artifact with a runtime switch.

`src/envValidation.ts` refuses to build a publish whose API URL is missing,
malformed, `http`, or still an `example.com` placeholder. Set `VITE_DEPLOY=1` to
hold a local build to the same rules.

### Environment

#### Configuring the Render deploy from GitHub

The deploy workflow pushes both images to GHCR and then asks Render to roll out.
That second half needs five things set on the **repository**, and until they are
set the workflow still pushes images and then warns that it deployed nothing:

| Name                          | Kind    | Where to find it                                       |
| ----------------------------- | ------- | ------------------------------------------------------ |
| `RENDER_API_KEY`              | secret  | Render → Account Settings → API Keys → Create           |
| `RENDER_API_SERVICE_ID`       | variable | the API service's id, `srv-…`                          |
| `RENDER_APP_SERVICE_ID`       | variable | the frontend service's id, `srv-…`                    |
| `APP_API_URL_STAGING`         | variable | the API's public URL, e.g. `https://crm-api.onrender.com` |
| `STAGING_API_HEALTH_URL`      | variable | the same plus `/health`                                |

Set them all at once:

```bash
RENDER_API_KEY=rnd_... node scripts/setup-render.mjs
```

It prompts for the four non-secret values, and takes them as arguments instead if
you would rather script it. Needs `gh auth login` (or a token with `actions:write`);
the secret goes through `gh secret set`, so it never appears in argv or shell
history.

Under **Settings → Secrets and variables → Actions**. Note the *variables* and
*secrets* are two separate tabs — a value in the wrong one is invisible to the
workflow, which is the most likely reason a deploy reports itself unconfigured
when you are looking at a value that plainly is there.

#### What the deploy does

Staging on every merge to `main`; production only via `workflow_dispatch`, because
that one should take a person to trigger. Both build the same way on purpose —
otherwise staging stops being evidence about production.

The rollout is verified by polling `STAGING_API_HEALTH_URL` after Render reports
the deploy live, so a service that starts but cannot reach its database fails the
job instead of being called successful.

#### Backend and frontend variables

Backend secrets are read at run time and never reach the browser.

| Service    | Variable          | Default                              |
| ---------- | ----------------- | ------------------------------------ |
| `backend`  | `DATABASE_URL`    | none — **required**                  |
| `backend`  | `JWT_SECRET`      | none — **required** in production    |
| `backend`  | `JWT_EXPIRES_IN`  | `12h`                                |
| `backend`  | `PORT`            | `5000`                               |
| `backend`  | `CORS_ORIGIN`     | `http://localhost:5173,http://127.0.0.1:5173` |
| `backend`  | `DATABASE_POOL_SIZE` | `10`                              |
| `backend`  | `RUN_MIGRATIONS`  | `true`                               |
| `backend`  | `EMAIL_API_KEY`   | none — email falls back to `mailto:` |
| `backend`  | `EMAIL_FROM`      | none                                 |
| `frontend` | `VITE_API_URL`    | `http://localhost:5000` in dev       |
| `frontend` | `VITE_API_TIMEOUT`| `60000`                              |
| `frontend` | `VITE_APP_ENV`    | from the build mode                  |
| `frontend` | `VITE_SENTRY_DSN` | none — **tracking off** when empty   |
| `frontend` | `VITE_APP_VERSION`| `unknown`                            |

Frontend env files are committed per mode and hold no secrets: `.env.development`,
`.env.staging`, `.env.production`. Override locally in `.env.local`, which is
gitignored and wins over all of them.

Error tracking is off unless `VITE_SENTRY_DSN` is set, so development and CI send
nothing anywhere and need no account. Before turning it on, note that it scrubs
request and response bodies, the auth header, and anything typed into a form — a
CRM holds names, emails and phone numbers, and an error report carrying a
customer's email is a data leak with a friendly dashboard.

### Before going live

- **Rotate the database password.** If it was ever pasted into a chat, a commit or
  a shared document, treat it as public.
- **Set a real `JWT_SECRET`** and a `CORS_ORIGIN` limited to your actual frontend
  host. `JWT_SECRET` is required in production, but `CORS_ORIGIN` silently defaults
  to the dev servers — and an origin that is not listed fails every request with no
  readable message in the browser.
- **Delete the seeded and demo accounts**, including any leftover test companies.
- **Serve over https**, or the JWT crosses the network in the clear.
- Run `npm run test:all` against a staging database before the first release.

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — auth and permissions, the data model,
  multi-tenancy, error handling, conventions, known limitations
- [frontend/README.md](frontend/README.md) — UI structure, pages, API usage
- [backend/README.md](backend/README.md) — schema, endpoints, query parameters,
  response shapes
