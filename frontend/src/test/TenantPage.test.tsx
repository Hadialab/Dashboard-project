import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import TenantPage from "../pages/Tenant";
import type { ApiKey, ApiKeyWithSecret, TenantSettings } from "../services/tenantService";
import {
  createApiKey,
  createWebhook,
  getTenantSettings,
  listApiKeys,
  listWebhooks,
  revokeApiKey,
  setWebhookActive,
  updateTenantSettings,
} from "../services/tenantService";
import useAuthStore from "../store/authStore";

// The properties worth pinning here are the ones that cost something to get wrong:
// a secret must not reappear on a refetch, a key must never be shown once it has
// been dismissed, and a rep must get an explanation rather than a broken form.

vi.mock("../services/tenantService", () => ({
  getTenantSettings: vi.fn(),
  updateTenantSettings: vi.fn(),
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  listWebhooks: vi.fn(),
  createWebhook: vi.fn(),
  setWebhookActive: vi.fn(),
  deleteWebhook: vi.fn(),
}));

const adminUser = { id: 1, name: "Admin", email: "a@t.local", role: "admin" };
const repUser = { id: 2, name: "Rep", email: "r@t.local", role: "rep" };

// Typed as TenantSettings. Without it, `logoUrl: null` and the other three nulls
// infer as implicit `any` — a bare `null` with no contextual type has none — and
// `defaultPermissions: {}` satisfies nothing: the field is a full Permissions
// object, so an empty one would be a fixture that cannot reach the API's shape.
const settings: TenantSettings = {
  displayName: "Tenant Co",
  logoUrl: null,
  website: null,
  supportEmail: null,
  defaultRole: "rep",
  defaultPermissions: {
    customers: { view: "all", create: true, edit: true, delete: true },
    leads: { view: "all", create: true, edit: true, delete: true },
    deals: { view: "all", create: true, edit: true, delete: true },
    reports: false,
  },
  locale: "en-GB",
  timezone: "UTC",
  organizationName: "Tenant Co",
  updatedAt: "2026-10-05T00:00:00Z",
};

// Typed for the same reason as `settings` above: the three null timestamps have no
// contextual type in an unannotated literal, so each infers as an implicit `any`.
//
// `over` is a partial of ApiKeyWithSecret rather than of ApiKey, because the
// create-key test adds `apiKeyOneTimeSecret`. That field exists only on the
// response to a creation, which is why the base object is ApiKey — matching the
// service's own `ApiKeyWithSecret = ApiKey & { ... }` rather than widening the
// type that a listed key has.
const keyRow = (over: Partial<ApiKeyWithSecret> = {}): ApiKey => ({
  id: "1",
  label: "Nightly sync",
  keyPrefix: "crm_a1b2c3d4",
  scopes: ["deals:read"],
  createdByName: "Admin",
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: "2026-10-05T00:00:00Z",
  ...over,
});

const hookRow = (over = {}) => ({
  id: "1",
  label: "Slack",
  targetUrl: "https://hooks.example.com/crm",
  events: ["delete"],
  isActive: true,
  createdByName: "Admin",
  lastDeliveries: [{ at: "2026-10-05T00:00:00Z", ok: false, error: "timed out" }],
  createdAt: "2026-10-05T00:00:00Z",
  ...over,
});

/** Puts a user in the store, which is where the page reads the role from. */
function signInAs(user: typeof adminUser) {
  useAuthStore.setState({ user, isLoggedIn: true } as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TenantPage />
    </MemoryRouter>,
  );
}

const apiError = (status: number, error: string) => {
  const failure = new axios.AxiosError("failed");
  failure.response = { status, data: { error } } as never;
  return failure;
};

beforeEach(() => {
  // mockReset rather than mockResolvedValue alone: re-setting an implementation does
  // not clear the call history, so "was it called?" would be answered by an earlier
  // test's call.
  vi.mocked(getTenantSettings).mockReset();
  vi.mocked(updateTenantSettings).mockReset();
  vi.mocked(listApiKeys).mockReset();
  vi.mocked(listWebhooks).mockReset();
  vi.mocked(createApiKey).mockReset();
  vi.mocked(createWebhook).mockReset();
  vi.mocked(revokeApiKey).mockReset();
  vi.mocked(setWebhookActive).mockReset();

  vi.mocked(getTenantSettings).mockResolvedValue(settings);
  vi.mocked(listApiKeys).mockResolvedValue({ keys: [], availableScopes: [] });
  vi.mocked(listWebhooks).mockResolvedValue({ webhooks: [] });
  vi.mocked(updateTenantSettings).mockResolvedValue(settings);
  vi.mocked(createApiKey).mockResolvedValue(
    keyRow({ apiKeyOneTimeSecret: "crm_" + "a".repeat(64) }) as ApiKeyWithSecret,
  );
  vi.mocked(createWebhook).mockResolvedValue(
    hookRow({ signingSecretOneTimeSecret: "whsec_" + "b".repeat(48) }) as never,
  );
  vi.mocked(revokeApiKey).mockResolvedValue(undefined);
  vi.mocked(setWebhookActive).mockResolvedValue(undefined);
  signInAs(adminUser);
});

describe("Company page", () => {
  it("shows the profile, the keys and the webhooks", async () => {
    vi.mocked(listApiKeys).mockResolvedValue({ keys: [keyRow()], availableScopes: [] });
    vi.mocked(listWebhooks).mockResolvedValue({ webhooks: [hookRow()] });

    renderPage();

    expect(await screen.findByDisplayValue("Tenant Co")).toBeInTheDocument();
    expect(screen.getByText("Nightly sync")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
  });

  it("never shows the secret again after the dialog is dismissed", async () => {
    vi.mocked(listApiKeys).mockResolvedValue({
      keys: [keyRow()],
      availableScopes: [],
    });

    renderPage();

    await screen.findByText("Nightly sync");
    await userEvent.click(screen.getByRole("button", { name: /new key/i }));
    await userEvent.type(screen.getByLabelText(/^name/i), "A script");
    await userEvent.click(screen.getByLabelText(/read deals/i));
    await userEvent.click(screen.getByRole("button", { name: /^create key$/i }));

    // Shown once, loudly, because losing it means revoking and re-minting.
    const secret = "crm_" + "a".repeat(64);
    expect(await screen.findByText(secret)).toBeInTheDocument();
    expect(screen.getByText(/only time it will be shown/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /i have saved it/i }));

    await waitFor(() => expect(screen.queryByText(secret)).not.toBeInTheDocument());

    // And a refetch — which is what every create does — does not bring it back,
    // because only a prefix is stored.
    await userEvent.click(screen.getByRole("button", { name: /new key/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
  });

  it("only sends the fields that changed", async () => {
    renderPage();
    await screen.findByDisplayValue("Tenant Co");

    await userEvent.clear(screen.getByLabelText(/display name/i));
    await userEvent.type(screen.getByLabelText(/display name/i), "Renamed Co");
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(updateTenantSettings).toHaveBeenCalled());
    // Sending the whole object would let a stale copy overwrite a change made in
    // another tab — the API treats an omitted field as "leave it alone".
    expect(vi.mocked(updateTenantSettings).mock.calls[0][0]).toEqual({
      displayName: "Renamed Co",
    });
  });

  it("says nothing to save when nothing changed", async () => {
    renderPage();
    await screen.findByDisplayValue("Tenant Co");

    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));

    // Otherwise a click with no edits writes an entry and tells the user it saved
    // something, which is the kind of small lie that makes a log untrustworthy.
    await waitFor(() => expect(updateTenantSettings).not.toHaveBeenCalled());
  });

  it("warns that a key with no scopes can do nothing", async () => {
    vi.mocked(listApiKeys).mockResolvedValue({
      keys: [keyRow({ scopes: [] })],
      availableScopes: [],
    });

    renderPage();

    expect(await screen.findByText(/cannot do anything/i)).toBeInTheDocument();
  });

  it("shows whether the last webhook delivery worked", async () => {
    vi.mocked(listWebhooks).mockResolvedValue({ webhooks: [hookRow()] });

    renderPage();

    // "Did it fire" is the first question about any integration, so it is answered
    // on the list rather than by reading logs.
    expect(await screen.findByText(/last delivery failed/i)).toBeInTheDocument();
  });

  it("explains a 403 rather than rendering a broken form", async () => {
    signInAs(repUser);
    vi.mocked(getTenantSettings).mockRejectedValue(apiError(403, "administrator"));

    renderPage();

    expect(await screen.findByText(/for administrators/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();
  });

  it("offers a retry when the load fails for another reason", async () => {
    vi.mocked(getTenantSettings).mockRejectedValue(apiError(500, "boom"));

    renderPage();

    const retry = await screen.findByRole("button", { name: /try again/i });
    vi.mocked(getTenantSettings).mockResolvedValue(settings);

    await userEvent.click(retry);

    expect(await screen.findByDisplayValue("Tenant Co")).toBeInTheDocument();
  });

  it("pauses a webhook without deleting it", async () => {
    vi.mocked(listWebhooks).mockResolvedValue({ webhooks: [hookRow()] });

    renderPage();

    await screen.findByText("Slack");
    await userEvent.click(screen.getByRole("button", { name: /^pause$/i }));

    await waitFor(() => expect(setWebhookActive).toHaveBeenCalledWith("1", false));
  });
});