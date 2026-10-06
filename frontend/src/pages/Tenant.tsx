import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Globe, KeyRound, Trash2, Webhook as WebhookIcon } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { formatRelative } from "../utils/time";
import useAuthStore from "../store/authStore";
import {
  createApiKey,
  createWebhook,
  deleteWebhook,
  getTenantSettings,
  listApiKeys,
  listWebhooks,
  revokeApiKey,
  setWebhookActive,
  updateTenantSettings,
} from "../services/tenantService";
import type { ApiKey, TenantSettings, Webhook } from "../services/tenantService";

/**
 * Company administration.
 *
 * Three things, because they are three different jobs that happen to share an
 * audience: how the company presents itself, credentials for scripts, and outbound
 * notifications. Grouping them as one page rather than three is the right call for
 * an admin with four people in their team and the wrong one for a company with
 * forty — at which point these want to be separate sections with their own
 * permissions.
 *
 * Every secret on this page is shown exactly once, and the copy says so. A reader
 * who skims past that warning and loses the key has to revoke it and mint another,
 * which is recoverable but annoying, so the warning is the loudest text in the
 * dialog rather than a footnote.
 */

const SCOPES: { value: string; label: string }[] = [
  { value: "customers:read", label: "Read customers" },
  { value: "customers:write", label: "Create and edit customers" },
  { value: "leads:read", label: "Read leads" },
  { value: "leads:write", label: "Create and edit leads" },
  { value: "deals:read", label: "Read deals" },
  { value: "deals:write", label: "Create and edit deals" },
  { value: "reports:read", label: "Read reports" },
];

const EVENTS: { value: string; label: string }[] = [
  { value: "create", label: "Record created" },
  { value: "update", label: "Record changed" },
  { value: "delete", label: "Record deleted" },
  { value: "convert", label: "Lead converted" },
];

/** Reverse lookup, so the list renders the same words the checkbox used. */
const EVENT_LABELS = Object.fromEntries(EVENTS.map((event) => [event.value, event.label]));

function TenantSettingsPage() {
  const currentUser = useAuthStore((state) => state.user);

  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Secrets, held only until dismissed. Never written back into state that a
  // refetch could re-render, because "shown once" has to mean once.
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const load = useCallback(async () => {
    try {
      // The settings request doubles as the admin check: a rep gets a 403, and
      // this turns into an explanation rather than a wall of broken forms.
      const [nextSettings, keyList, hookList] = await Promise.all([
        getTenantSettings(),
        listApiKeys(),
        listWebhooks(),
      ]);

      setSettings(nextSettings);
      setKeys(keyList.keys);
      setHooks(hookList.webhooks);
      setError("");
    } catch (cause) {
      const status = (cause as { response?: { status?: number } })?.response?.status;

      setError(
        status === 403
          ? "only administrators can manage company settings, keys and integrations."
          : "Could not load your company settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A rep reaching this URL should be told why, not left on a spinner.
  if (!isAdmin && !loading && !error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="ADMINISTRATION" title="Company" />
        <EmptyState
          title="This section is for administrators"
          description="Your account can see the customers, leads and deals you have access to, but company settings, API keys and integrations are limited to administrators."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="ADMINISTRATION" title="Company" />
        {error.includes("administrators") ? (
          <EmptyState title="This section is for administrators" description={error} />
        ) : (
          <ErrorState message={error} onRetry={() => void load()} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Company"
        description="How your company appears, credentials for scripts, and where we send events."
      />

      <CompanyProfile settings={settings} onSaved={load} />

      <ApiKeysSection
        keys={keys}
        onCreate={async (label, scopes) => {
          const created = await createApiKey({ label, scopes });
          setRevealedKey(created.apiKeyOneTimeSecret);
          await load();
        }}
        onRevoke={async (id) => {
          await revokeApiKey(id);
          toast.success("Key revoked. It stops working on its next request.");
          await load();
        }}
      />

      <WebhooksSection
        webhooks={hooks}
        onCreate={async (label, targetUrl, events) => {
          const created = await createWebhook({ label, targetUrl, events });
          setRevealedSecret(created.signingSecretOneTimeSecret);
          await load();
        }}
        onToggle={async (id, active) => {
          await setWebhookActive(id, active);
          await load();
        }}
        onDelete={async (id) => {
          await deleteWebhook(id);
          toast.success("Webhook deleted.");
          await load();
        }}
      />

      {/* Both dialogs share one shape but not one piece of state: a key and a
          signing secret are different things with different consequences. */}
      <SecretDialog
        title="Your new API key"
        secret={revealedKey}
        intro="Use this as a bearer token: Authorization: Bearer <key>"
        onClose={() => setRevealedKey(null)}
      />
      <SecretDialog
        title="Your webhook signing secret"
        secret={revealedSecret}
        intro="Give this to the receiving system so it can verify each delivery."
        onClose={() => setRevealedSecret(null)}
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
    </div>
  );
}

function CompanyProfile({
  settings,
  onSaved,
}: {
  settings: TenantSettings | null;
  onSaved: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [website, setWebsite] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Seeded once, from the load. Re-seeding on every settings change would discard
  // half-typed edits whenever a background refetch landed.
  useEffect(() => {
    if (!settings) return;
    setDisplayName(settings.displayName);
    setWebsite(settings.website ?? "");
    setSupportEmail(settings.supportEmail ?? "");
  }, [settings]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Only the fields that changed, because the API treats an omitted field as
      // "leave it alone" — sending the whole object would let a stale copy
      // overwrite a change made in another tab.
      const changes: Record<string, string> = {};
      if (displayName !== settings?.displayName) changes.displayName = displayName;
      if (website !== (settings?.website ?? "")) changes.website = website;
      if (supportEmail !== (settings?.supportEmail ?? "")) changes.supportEmail = supportEmail;

      if (Object.keys(changes).length === 0) {
        toast.success("Nothing to save.");
        return;
      }

      await updateTenantSettings(changes);
      await onSaved();
      toast.success("Company settings saved.");
    } catch (cause) {
      setError(
        (cause as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not save. Check the values and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <Globe size={18} aria-hidden="true" /> Profile
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Shown across the app and in anything we send on your behalf.
      </p>

      <form className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={save}>
        <Input
          label="Display name"
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Your company"
        />
        <Input
          label="Website"
          name="website"
          type="url"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="https://example.com"
        />
        <Input
          label="Support email"
          name="supportEmail"
          type="email"
          value={supportEmail}
          onChange={(event) => setSupportEmail(event.target.value)}
          placeholder="support@example.com"
        />

        {error && (
          <p role="alert" className="text-sm text-rose-600 sm:col-span-2">
            {error}
          </p>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ApiKeysSection({
  keys,
  onCreate,
  onRevoke,
}: {
  keys: ApiKey[];
  onCreate: (label: string, scopes: string[]) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await onCreate(label, scopes);
      setAdding(false);
      setLabel("");
      // Reset to nothing rather than to "everything": a key that can do
      // everything is not a key, it is a missing permission model.
      setScopes([]);
    } catch (cause) {
      toast.error(
        (cause as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not create the key.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <KeyRound size={18} aria-hidden="true" /> API keys
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            For scripts and integrations. A key can only do what its scopes allow, and can never
            reach your team, your audit log or these settings.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} icon={KeyRound}>
          New key
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {keys.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No keys yet.
          </li>
        )}

        {keys.map((key) => (
          <li
            key={key.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-white">{key.label}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{key.keyPrefix}…</code>
                {" · "}
                {key.scopes.length === 0
                  ? "no scopes — this key cannot do anything"
                  : key.scopes.join(", ")}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {key.revokedAt
                  ? `Revoked ${formatRelative(key.revokedAt)}`
                  : key.lastUsedAt
                    ? `Last used ${formatRelative(key.lastUsedAt)}`
                    : "Never used"}
                {key.createdByName ? ` · made by ${key.createdByName}` : ""}
              </p>
            </div>

            {!key.revokedAt && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => void onRevoke(key.id)}
                icon={Trash2}
              >
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="New API key"
        description="The key is shown once, immediately after you create it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()} disabled={busy || label.trim().length < 2}>
              {busy ? "Creating..." : "Create key"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            name="keyLabel"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Nightly sync"
          />

          <fieldset>
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
              What may it do?
            </legend>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Write includes read. A key with nothing selected can do nothing at all.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SCOPES.map((scope) => (
                <label key={scope.value} className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope.value)}
                    onChange={(event) =>
                      setScopes((current) =>
                        event.target.checked
                          ? [...current, scope.value]
                          : current.filter((value) => value !== scope.value),
                      )
                    }
                  />
                  <span className="text-slate-700 dark:text-slate-300">{scope.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Modal>
    </Card>
  );
}

function WebhooksSection({
  webhooks,
  onCreate,
  onToggle,
  onDelete,
}: {
  webhooks: Webhook[];
  onCreate: (label: string, targetUrl: string, events: string[]) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await onCreate(label, targetUrl, events);
      setAdding(false);
      setLabel("");
      setTargetUrl("");
      setEvents([]);
    } catch (cause) {
      toast.error(
        (cause as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not create the webhook.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <WebhookIcon size={18} aria-hidden="true" /> Webhooks
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Post a signed notification to another system when something changes. Each delivery is
            tried once and its result is recorded — nothing is retried, so a third party being
            down never blocks a save.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} icon={WebhookIcon}>
          New webhook
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {webhooks.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No webhooks yet.
          </li>
        )}

        {webhooks.map((hook) => (
          <li
            key={hook.id}
            className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">
                  {hook.label}
                  {!hook.isActive && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                      paused
                    </span>
                  )}
                </p>
                <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-slate-400">
                  {hook.targetUrl}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {/* Labels, not the stored values: "delete" is what the API speaks
                      and "Record deleted" is what a person reading the list needs. */}
                  {hook.events.length === 0
                    ? "All events"
                    : hook.events
                        .map((event) => EVENT_LABELS[event] ?? event)
                        .join(", ")}
                  {hook.lastDeliveries[0] && (
                    <>
                      {" · "}
                      {hook.lastDeliveries[0].ok
                        ? `last delivery ${formatRelative(hook.lastDeliveries[0].at)}`
                        : `last delivery failed ${formatRelative(hook.lastDeliveries[0].at)}`}
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void onToggle(hook.id, !hook.isActive)}
                >
                  {hook.isActive ? "Pause" : "Resume"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void onDelete(hook.id)}
                  icon={Trash2}
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="New webhook"
        description="We will POST a signed JSON payload for each matching event."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void create()}
              disabled={busy || label.trim().length < 2 || !targetUrl.trim()}
            >
              {busy ? "Creating..." : "Create webhook"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            name="hookLabel"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Closed deals to Slack"
          />
          <Input
            label="Target URL"
            name="targetUrl"
            type="url"
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
            placeholder="https://hooks.example.com/crm"
          />

          <fieldset>
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Which events?
            </legend>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select none to receive everything.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EVENTS.map((event) => (
                <label key={event.value} className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={events.includes(event.value)}
                    onChange={(change) =>
                      setEvents((current) =>
                        change.target.checked
                          ? [...current, event.value]
                          : current.filter((value) => value !== event.value),
                      )
                    }
                  />
                  <span className="text-slate-700 dark:text-slate-300">{event.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            The payload identifies the record; it does not contain the record. Your receiving
            system gets an <code>X-CRM-Signature</code> header over the timestamp and body, so it
            can tell the request came from here and reject a replay.
          </p>
        </div>
      </Modal>
    </Card>
  );
}

/**
 * Shows a secret once.
 *
 * The warning is the most prominent thing in the dialog, deliberately. A reader who
 * dismisses this and loses the key has to revoke it and mint another — recoverable,
 * but the cost of a loud warning is much lower than the cost of a quiet one.
 */
function SecretDialog({
  title,
  secret,
  intro,
  onClose,
}: {
  title: string;
  secret: string | null;
  intro: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [secret]);

  if (!secret) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={intro}
      footer={
        <Button onClick={onClose} icon={Check}>
          I have saved it
        </Button>
      }
    >
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        This is the only time it will be shown. If you lose it, revoke the key and create
        another.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          {secret}
        </code>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard?.writeText(secret);
            setCopied(true);
            toast.success("Copied");
          }}
          icon={copied ? Check : Copy}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </Modal>
  );
}

export default TenantSettingsPage;