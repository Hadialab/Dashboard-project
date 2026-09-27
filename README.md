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

| Service   | Variable       | Default                 |
| --------- | -------------- | ----------------------- |
| `backend` | `PORT`         | `5000`                  |
| `backend` | `CORS_ORIGIN`  | `http://localhost:5173` |
| `frontend`| `VITE_API_URL` | `http://localhost:5000` |

## Layout

- [`frontend/README.md`](frontend/README.md) — UI structure, pages, API usage
- [`backend/README.md`](backend/README.md) — endpoints, query params, response shapes

## Deploying

The frontend is set up for Vercel (`frontend/vercel.json` handles SPA
routing). Set `VITE_API_URL` to your deployed API. The backend runs on any
Node host; Render works, and expects `npm start` with the repo root set to
`backend/`.

## Before going live

The API has **no authentication** — login and register are client-side only, and
every endpoint is publicly writable. Add real auth and authorization before
putting this on the internet.
