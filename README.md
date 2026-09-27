# CRM Dashboard

A CRM dashboard with a React front end and an Express REST API, in one repo.

```
frontend/   React + Vite UI
backend/    Express API for customers, deals and leads
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

## Auth

Sign-in is enforced by the API, not just hidden in the UI. Passwords are hashed
with bcrypt, login returns a JWT, and every `/customers`, `/deals` and `/leads`
request without a valid token gets a `401`. See
[`backend/README.md`](backend/README.md#authentication).

## Before going live

Two things are still open:

- **Any registered user can read and write all CRM data.** There are no roles or
  ownership rules yet.
- **Logout does not revoke an issued token.** Tokens are stateless, so clearing
  the client copy ends the session in the browser but a captured token stays
  valid until it expires.
