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

`src/api/axios.js` holds the base URL. All requests go through it:

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

Login and register are client-side only for now — credentials are checked in
`pages/Login.jsx` against a demo account and `localStorage`, then stored as
cookies by `store/authStore.js`. `routes/ProtectedRoute.jsx` gates routes on that
cookie. There is no real authentication on the API yet; treat it as read/write
access to demo data.
