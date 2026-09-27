# CRM Dashboard

React front end for the CRM dashboard. Works against the API in `../backend`
during development, and against a deployed API via `VITE_API_URL`.

## Stack

Vite, React 19, React Router, Zustand, Tailwind CSS 4, Yup, Recharts.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs on http://localhost:5173. It needs the backend to be running for
data to load — see `../backend/README.md`.

## Scripts

| Script          | Purpose                          |
| --------------- | -------------------------------- |
| `npm run dev`   | Start the Vite dev server        |
| `npm run build` | Production build to `dist/`      |
| `npm run lint`  | Lint with oxlint                 |
| `npm run preview` | Serve the production build     |

## API

`src/api/axios.js` holds the base URL and attaches the session token to every
request. All requests go through it:

| Service                        | Endpoints                                    |
| ------------------------------ | -------------------------------------------- |
| `services/customerService.js`  | `GET/POST /customers`, `PUT/DELETE /customers/:id` |
| `services/dealService.js`      | `GET/POST /deals`, `PUT/DELETE /deals/:id`   |
| `services/leadService.js`      | `GET/POST /leads`, `PUT/DELETE /leads/:id`   |

`Reports.jsx` also reads `/customers`, `/leads` and `/deals` for its charts.

### Pagination

`getCustomers` sends `_page` and `_per_page`, so the API answers with a
pagination envelope rather than a bare array:

```json
{ "first": 1, "prev": null, "next": 2, "last": 7, "pages": 7, "items": 20, "data": [] }
```

Without those params the same endpoint returns a plain array, which is what the
deals, leads and reports callers expect. Handle both shapes when adding callers.

Search is sent as `q`. Sorting uses `_sort=-field` for descending. The status
filter is a plain `status=Active` query param.

## Auth

Authentication is real and enforced by the API. `pages/Login.jsx` and
`pages/Register.jsx` post to `/auth/login` and `/auth/register`; the API hashes
the password, returns a JWT, and rejects unauthenticated requests to the CRM
data. Nothing credential-related is kept in `localStorage` or cookies.

- `services/authService.js` — the three auth calls
- `store/authStore.js` — session state, holds the token
- `routes/ProtectedRoute.jsx` — validates the stored token on load, then gates routes

On startup `ProtectedRoute` calls `/auth/me` to confirm the token is still
valid, rather than trusting whatever is in storage. If any request comes back
401, the axios interceptor clears the token and dispatches an event that logs
the user out, so an expired session lands on `/login` instead of looping on
failed requests.

Demo account: `admin@example.com` / `admin123`.

The token lives in `localStorage` under `crm_token`. That is readable by any
script on the page, so it is vulnerable to token theft through XSS; an httpOnly
cookie is the stronger choice and would need the dev server proxy set up.
