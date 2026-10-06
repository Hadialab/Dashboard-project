import api from "../api/axios";
import type { Permissions } from "../types";

// Company settings, API keys and webhooks.
//
// Admin-only: the API refuses these to a rep regardless of the permission table,
// because they describe the company rather than its data. A rep who could read
// them could read which integrations the company runs.

export type TenantSettings = {
  /** Falls back to the organization's own name, so it is never blank. */
  displayName: string;
  logoUrl: string | null;
  website: string | null;
  supportEmail: string | null;
  defaultRole: "admin" | "rep";
  defaultPermissions: Permissions;
  locale: string;
  timezone: string;
  /** The legal/billing name, which `displayName` sits alongside rather than replaces. */
  organizationName: string | null;
  updatedAt: string;
};

export type ApiKey = {
  id: string;
  label: string;
  /** 8 characters. Enough to identify a key in a list, never enough to use one. */
  keyPrefix: string;
  scopes: string[];
  createdByName: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

/** The response to creating a key. The secret is in here and nowhere else, ever. */
export type ApiKeyWithSecret = ApiKey & { apiKeyOneTimeSecret: string };

export type WebhookDelivery = {
  at: string;
  ok: boolean;
  status?: number;
  error?: string;
};

export type Webhook = {
  id: string;
  label: string;
  targetUrl: string;
  events: string[];
  isActive: boolean;
  createdByName: string | null;
  lastDeliveries: WebhookDelivery[];
  createdAt: string;
};

export type WebhookWithSecret = Webhook & { signingSecretOneTimeSecret: string };

export async function getTenantSettings(): Promise<TenantSettings> {
  const response = await api.get<TenantSettings>("/tenant/settings");
  return response.data;
}

/**
 * Updates settings.
 *
 * Only the fields the caller actually changed are sent, because the API treats an
 * omitted field as "leave it alone" — sending the whole object would mean a stale
 * copy could silently overwrite a change made in another tab.
 */
export async function updateTenantSettings(
  changes: Partial<Pick<TenantSettings, "displayName" | "logoUrl" | "website" | "supportEmail">>,
): Promise<TenantSettings> {
  const response = await api.patch<TenantSettings>("/tenant/settings", changes);
  return response.data;
}

export async function listApiKeys(): Promise<{
  keys: ApiKey[];
  availableScopes: string[];
}> {
  const response = await api.get("/tenant/api-keys");
  return response.data;
}

export async function createApiKey(input: {
  label: string;
  scopes: string[];
}): Promise<ApiKeyWithSecret> {
  const response = await api.post<ApiKeyWithSecret>("/tenant/api-keys", input);
  return response.data;
}

/**
 * Revokes a key.
 *
 * Revoked rather than deleted, so the audit log still shows that the key existed
 * and when it stopped working.
 */
export async function revokeApiKey(id: string): Promise<void> {
  await api.delete(`/tenant/api-keys/${id}`);
}

export async function listWebhooks(): Promise<{ webhooks: Webhook[] }> {
  const response = await api.get<{ webhooks: Webhook[] }>("/tenant/webhooks");
  return response.data;
}

export async function createWebhook(input: {
  label: string;
  targetUrl: string;
  events: string[];
}): Promise<WebhookWithSecret> {
  const response = await api.post<WebhookWithSecret>("/tenant/webhooks", input);
  return response.data;
}

export async function setWebhookActive(id: string, isActive: boolean): Promise<void> {
  await api.patch(`/tenant/webhooks/${id}`, { isActive });
}

export async function deleteWebhook(id: string): Promise<void> {
  await api.delete(`/tenant/webhooks/${id}`);
}