# CRM Dashboard

A CRM dashboard with a React front end and an Express REST API, in one repo.

```
frontend/   React + Vite UI
backend/    Express API: customers, deals, leads, users, notes, follow-ups
```

## Requirements

Node 18 or newer.

## Running it

Two terminals, from the repo root:

```bash
# terminal 1 — API on http://localhost:5000
cd backend
npm install
npm run dev

# terminal 2 — UI on http://localhost:5173
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 and sign in with the demo account:

```
admin@example.com / admin123
```

The API creates `backend/data/db.json` from seed data on first start, so there
is no database to install or configure.

## Configuration

Both services read a `.env` file; each has a committed `.env.example` to copy.

| Service   | Variable          | Default                 |
| --------- | ----------------- | ----------------------- |
| `backend` | `PORT`            | `5000`                  |
| `backend` | `CORS_ORIGIN`     | `http://localhost:5173` |
| `backend` | `JWT_SECRET`      | none — required in production |
| `backend` | `JWT_EXPIRES_IN`  | `12h`                   |
| `backend` | `EMAIL_API_KEY`   | none — email falls back to `mailto:` |
| `backend` | `EMAIL_FROM`      | none                    |
| `frontend`| `VITE_API_URL`    | `http://localhost:5000` |

`JWT_SECRET` is blank in `backend/.env.example`. The API refuses to start with
`NODE_ENV=production` unless it is set. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Layout

- [`frontend/README.md`](frontend/README.md) — UI structure, pages, API usage
- [`backend/README.md`](backend/README.md) — endpoints, query params, response shapes

## Deploying

Not set up yet — deployment comes after the backend work. `frontend/vercel.json`
handles SPA routing if the frontend goes to Vercel, and `VITE_API_URL` will
point at whatever host the API ends up on.

## Auth and roles

Sign-in is enforced by the API, not just hidden in the UI. Passwords are hashed
with bcrypt, login returns a JWT, and every CRM request without a valid token
gets a `401`.

Two roles. **Admins** see everything and manage the team. **Sales reps** see all
customers — those are shared — but only the leads and deals they own, enforced on
the server rather than in the UI. See
[`backend/README.md`](backend/README.md#roles-and-record-visibility).

## Activity, notes and follow-ups

Every customer and deal has an activity timeline and a list of scheduled
follow-ups. Notes record what happened; follow-ups track what is still to do,
with a due date and a done state.

Calendar and email work with no configuration: the Calendar button writes an
`.ics` file the user's own calendar opens, and Email opens a `mailto:` link. Set
`EMAIL_API_KEY` and `EMAIL_FROM` on the backend to send server-side through
Resend instead.

## Before going live

- **Logout does not revoke an issued token.** Tokens are stateless, so clearing
  the client copy ends the session in the browser but a captured token stays
  valid until it expires. A revocation list is the fix.
- **Email is optional and off by default.** Until a provider is configured the
  Email button falls back to the user's own mail client.
- **No password reset flow.** Admins can set a password by removing and re-adding
  a team member; a self-service reset needs an email provider.
