# Design System

One scale for radius, shadow, spacing, and type, so every page reads as part of
the same product. Tokens are defined in `src/index.css` under `@theme` (Tailwind
v4) — edit them there, not in each component.

## Radius

Four steps, each with a fixed role. Picking the wrong one is the most common
inconsistency, so the role matters more than the value.

| Token    | Value | Role                                                       |
| -------- | ----- | ---------------------------------------------------------- |
| `rounded-md`  | 6px  | Chips, inline tags, badges                                  |
| `rounded-lg`  | 10px | **Interactive**: inputs, selects, buttons, table cells, nav items |
| `rounded-xl`  | 14px | **Surfaces**: cards, panels, table containers                |
| `rounded-2xl` | 20px | **Overlays**: modals, drawers, dropdowns                     |
| `rounded-full`| —    | Avatars, status dots, pills only                             |

`rounded-3xl` and arbitrary values like `rounded-[2rem]` are not part of the
system. Don't introduce them.

## Shadow

Three steps. Shadows mark elevation, and there are only three levels in this app.

| Token      | Role                                              |
| ---------- | ------------------------------------------------- |
| `shadow-xs` | Table containers, flat panels                     |
| `shadow-sm` | **Cards** — the default raised surface            |
| `shadow-lg` | **Overlays only** — modals, drawers, dropdowns    |

`shadow-md`, `shadow-xl` and `shadow-2xl` are not in the system.

Note that shadows are much less visible in dark mode, so dark surfaces lean on
`border-slate-800` for separation rather than a heavier shadow.

## Spacing

| Token         | Role                                                     |
| ------------- | -------------------------------------------------------- |
| `space-y-6`   | **Between page sections** — the vertical page rhythm      |
| `space-y-3`   | Between related items inside one section                  |
| `p-4`         | **Card inner padding**                                    |
| `p-6`         | Modal and drawer body padding                             |
| `px-4 py-3`   | **Inputs and buttons**                                    |
| `gap-3`       | Grid and flex gaps                                        |
| `gap-2`       | Tight gaps, e.g. inside a button                          |

Page containers use `px-4 sm:px-6 lg:px-8` (already in `DashboardLayout`).

## Type

Four roles. One weight per role — weight is not a free choice.

| Role            | Classes                    | Weight          |
| --------------- | -------------------------- | --------------- |
| Page title      | `text-2xl sm:text-3xl`     | `font-bold`     |
| Section heading | `text-lg`                  | `font-semibold` |
| Body / cell     | `text-sm`                  | default         |
| Label / meta    | `text-xs`                  | `font-medium`   |

Uppercase eyebrow labels above a page title use `text-xs font-semibold
uppercase tracking-[0.3em] text-slate-500`.

## Color

The palette is already consistent, so it stays:

- **Surfaces** — `slate` scale. Page `bg-slate-100` / dark `bg-slate-950`,
  cards `bg-white` / dark `bg-slate-950`, borders `border-slate-200` / dark
  `border-slate-800`.
- **Accent** — `blue-600`, with `blue-700` for hover. One accent, no second hue.
- **Destructive** — `red-600`/`red-50` with `red-200` borders, dark equivalents
  `red-300`/`red-950`/`red-900`.
- **Text** — `text-slate-900` headings, `text-slate-500`/`600` body and meta,
  dark: `text-white` and `text-slate-400`/`300`.

Every color utility needs its `dark:` counterpart. There is no light-only
surface.

## Breakpoints and touch

- `sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px (Tailwind defaults).
- Multi-column grids stack to one column below `md`.
- Tables scroll horizontally inside their own container (`overflow-x-auto`),
  never the page. `html`/`body` have `overflow-x: hidden` as a backstop.
- Modals and drawers go full-screen on mobile, centred `max-w-*` above `sm`.
- Tap targets are at least 44px tall on touch devices, enforced globally in
  `index.css` for `pointer: coarse`.

## Primitives

Use these instead of hand-rolling the same markup:

| Component      | Import from                          |
| -------------- | ------------------------------------ |
| `Card`         | `components/ui/Card`                 |
| `PageHeader`   | `components/ui/PageHeader`           |
| `Button`       | `components/ui/Button`               |
| `Input`        | `components/ui/Input`                |
| `Select`       | `components/ui/Select`               |
| `Modal`        | `components/ui/Modal`                |
| `Drawer`       | `components/ui/Drawer`               |
| `EmptyState`   | `components/ui/EmptyState`           |
| `Skeleton`     | `components/ui/Skeleton`             |
| `DataCard`     | `components/ui/DataCard`             |

They are styling only — they hold no data fetching or business logic. If a page
needs different visuals, add a variant rather than forking the primitive.

## Rules

1. No arbitrary values (`w-[820px]`, `text-[11px]`, `rounded-[2rem]`) for
   ordinary styling. Use a token or a breakpoint.
2. Every color utility gets a `dark:` counterpart.
3. Interactive elements are `rounded-lg`, not `rounded-xl` or `rounded-2xl`.
4. Overlays are the only things that get `rounded-2xl` and `shadow-lg`.
5. No new page invents a page title size. Use `PageHeader`.
