import api from "../api/axios";
import type { AuditFilters, AuditLogResponse } from "../types";

// Read-only by design. There is deliberately no create, update or delete here,
// matching the API: an audit trail a client can edit is not one. The single
// omission is deliberate rather than forgotten, and it is why this file has one
// exported function against the four in teamService.

/**
 * The company's audit log, filtered and paginated.
 *
 * Empty filter values are dropped rather than sent as "" — the server treats a
 * present-but-empty value as "no filter" for most fields, but a stray
 * `entityId=""` would match every row via `ILIKE '%%'`, and being explicit here
 * removes the question entirely.
 */
export async function getAuditLog(filters: AuditFilters = {}): Promise<AuditLogResponse> {
  const params: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === "") continue;
    params[key] = typeof value === "number" ? value : String(value);
  }

  const response = await api.get<AuditLogResponse>("/audit", { params });
  return response.data;
}