// Query helpers for filtering, searching, sorting and paginating a collection.
//
// The parameter names (`_page`, `_per_page`, `_sort`, `q`) are kept from the
// json-server mock the app was originally built against, so the existing
// services and pages work unchanged.

// Pagination metadata is only wrapped up when pagination was actually asked for.
// Without _page/_per_page the response is a bare array, which is what
// Reports.jsx and the deals/leads services expect.
export function wantsPagination(query) {
  return query._page !== undefined || query._per_page !== undefined;
}

// Filters on exact field matches (status=Active, stage=Won, ...). Any query key
// that is not a reserved control param is treated as an equality filter.
const RESERVED = new Set([
  "_page", "_per_page", "_sort", "_order", "_start", "_end", "_limit", "q", "search",
]);

export function applyFilters(rows, query, allowedFields) {
  let result = rows;

  for (const [key, value] of Object.entries(query)) {
    if (RESERVED.has(key)) continue;
    if (allowedFields && !allowedFields.includes(key)) continue;
    if (value === "" || value === "All") continue;

    // Express turns `status[$gt]=x` into an object. Reject anything that is not
    // a plain scalar instead of stringifying it, so operator-style query
    // injection can't be used to probe or reshape the response.
    if (typeof value === "object") continue;

    result = result.filter((row) => String(row[key]) === String(value));
  }

  return result;
}

// Free-text search across the given fields. The old mock ignored a `q` param
// entirely, so the search box silently did nothing; this actually filters.
export function applySearch(rows, query, fields) {
  const term = (query.q ?? query.search ?? "").toString().trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) =>
    fields.some((field) => String(row[field] ?? "").toLowerCase().includes(term)),
  );
}

// Supports both `_sort=field` / `_sort=-field` (what the frontend sends) and a
// separate `_order` param. Unknown fields are ignored rather than throwing, so
// a bad sort can't 500 the page.
export function applySort(rows, query) {
  const raw = query._sort;
  if (!raw) return rows;

  const descending = String(raw).startsWith("-");
  const field = descending ? String(raw).slice(1) : String(raw);
  const order = query._order ? String(query._order).toLowerCase() : null;
  const dir = order === "desc" ? -1 : descending ? -1 : 1;

  if (!field || !rows.some((row) => field in row)) return rows;

  return [...rows].sort((a, b) => {
    const left = a[field];
    const right = b[field];

    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * dir;
    }

    return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * dir;
  });
}

export function paginate(rows, query) {
  const perPage = Math.max(1, Number.parseInt(query._per_page, 10) || 10);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const page = Math.min(Math.max(1, Number.parseInt(query._page, 10) || 1), totalPages);

  const start = (page - 1) * perPage;
  const data = rows.slice(start, start + perPage);

  return {
    first: 1,
    prev: page > 1 ? page - 1 : null,
    next: page < totalPages ? page + 1 : null,
    last: totalPages,
    pages: totalPages,
    items: totalItems,
    data,
  };
}

// Single entry point: filter -> search -> sort -> paginate.
export function runQuery(rows, query, config) {
  let result = applyFilters(rows, query, config.fields);
  result = applySearch(result, query, config.searchFields);
  result = applySort(result, query);

  if (wantsPagination(query)) return paginate(result, query);
  return result;
}
