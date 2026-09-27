# CRM Dashboard

A multi-tenant CRM: React front end, Express + PostgreSQL API, one repo.

```
frontend/   React + Vite UI
backend/    Express API + PostgreSQL: customers, deals, leads, users, notes, follow-ups
```

## Requirements

- Node 18 or newer
- PostgreSQL 14 or newer, reachable from the API

## Running it

**1. Create an empty database**

```sql
CREATE DATABASE crm;
```

**2. API on http://localhost:5000**

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

```bash
npm run dev
```

**3. UI on http://localhost:5173**

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 and **register**.

There is no seed script and no demo account. An empty database stays empty until
someone signs up, and the first account creates its own company.

The schema is created automatically on first boot from `backend/src/db/schema.sql`.

## Companies

**Every sign-up creates a new company, and the person signing up becomes that
company's admin.** There is no shared signup pool and no way to join an existing
company.

That is what lets one database serve several unrelated businesses: every row
carries an `organization_id`, and the API filters on it for every read and
write, so no company can see another's records. See
[`backend/README.md`](backend/README.md#companies-and-sign-up).

The admin then adds their own team from the Team page and decides what each
person can do.

## Configuration

Both services read a `.env` file; each has a committed `.env.example` to copy.
`.env` itself is gitignored — never commit it.

| Service   | Variable             | Default                            |
| --------- | -------------------- | ---------------------------------- |
| `backend` | `DATABASE_URL`       | none — **required**                |
| `backend` | `DATABASE_POOL_SIZE` | `10`                               |
| `backend` | `RUN_MIGRATIONS`     | `true`                             |
| `backend` | `PORT`               | `5000`                             |
| `backend` | `CORS_ORIGIN`        | `http://localhost:5173,http://127.0.0.1:5173` |
| `backend` | `JWT_SECRET`         | none — required in production      |
| `backend` | `JWT_EXPIRES_IN`     | `12h`                              |
| `backend` | `EMAIL_API_KEY`      | none — email falls back to `mailto:` |
| `backend` | `EMAIL_FROM`         | none                               |
| `frontend`| `VITE_API_URL`       | `http://localhost:5000`            |

`/health` reports both the API and the database, so a deployment that started
but cannot reach Postgres shows up as `503` rather than failing on every
request.

## Layout

- [`frontend/README.md`](frontend/README.md) — UI structure, pages, API usage
- [`backend/README.md`](backend/README.md) — schema, endpoints, query params, response shapes

## Auth and roles

Sign-in is enforced by the API, not just hidden in the UI. Passwords are hashed
with bcrypt, login returns a JWT, and every CRM request without a valid token
gets a `401`. The user is re-read on every request, so a deleted account or a
changed permission takes effect immediately.

**Admins** always have full access and manage their own team. **Sales** access is
set per person: for each of customers, leads, deals and reports, the admin
chooses whether they can view it — nothing, their own records, or everything —
plus whether they can create, edit and delete. New Sales accounts start with a
standard salesperson's access, which you can then tune from the Team page.

The API enforces all of this; the UI hides the controls it would reject. See
[`backend/README.md`](backend/README.md#roles-and-permissions).

## Activity, notes and follow-ups

Every customer and deal has an activity timeline and a list of scheduled
follow-ups. Notes record what happened; follow-ups track what is still to do,
with a due date and a done state. Both inherit the visibility of the record they
hang off, and are removed with it.

Calendar and email work with no configuration: the Calendar button writes an
`.ics` file the user's own calendar opens, and Email opens a `mailto:` link. Set
`EMAIL_API_KEY` and `EMAIL_FROM` on the backend to send server-side through
Resend instead.

## Before going live

- **Rotate the database password.** If it was ever pasted into a chat, a commit
  or a shared document, treat it as public.
- **Set a real `JWT_SECRET`** and a `CORS_ORIGIN` limited to your real frontend
  host. `JWT_SECRET` is required in production, but `CORS_ORIGIN` defaults to
  the dev servers.
- **Logout does not revoke an issued token.** Tokens are stateless, so clearing
  the client copy ends the session in the browser but a captured token stays
  valid until it expires. A revocation list is the fix.
- **No password reset flow.** An admin can set a password by removing and
  re-adding a team member; self-service reset needs an email provider.
- **Deals store a customer name, not a customer id**, so a deal follow-up has no
  email address of its own and sends from the linked customer instead.
