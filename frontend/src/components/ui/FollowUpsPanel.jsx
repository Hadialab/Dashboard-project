import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarPlus,
  Check,
  Mail,
  Phone,
  Trash2,
  Users,
} from "lucide-react";
import {
  createFollowUp,
  deleteFollowUp,
  getFollowUps,
  notifyFollowUp,
  updateFollowUp,
} from "../../services/followUpService";
import {
  buildMailtoForFollowUp,
  downloadIcsForFollowUp,
  followUpTypeLabel,
  isOverdue,
} from "../../utils/calendar";
import useAuthStore from "../../store/authStore";
import Button from "./Button";
import Select from "./Select";

const TYPES = ["call", "email", "meeting", "task"];

const TYPE_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: Check,
};

const emptyForm = { title: "", type: "call", dueAt: "", details: "" };

/**
 * Scheduled follow-ups for one record.
 *
 * Calendar and email work with no configuration: "Add to calendar" writes an
 * .ics file the user's own calendar opens, and "Email" opens a mailto: link.
 * The server-side sender is used when it is configured, and the UI says so
 * rather than silently doing nothing.
 */
function FollowUpsPanel({ entityType, entityId, contact }) {
  const currentUser = useAuthStore((state) => state.user);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;

    try {
      setLoading(true);
      setItems(await getFollowUps({ entityType, entityId }));
      setError("");
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.dueAt) {
      setError("A title and a due date are required.");
      return;
    }

    try {
      setSaving(true);
      const created = await createFollowUp({
        entityType,
        entityId,
        title: form.title.trim(),
        type: form.type,
        dueAt: form.dueAt,
        details: form.details.trim(),
      });

      setItems((prev) => [...prev, created].sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
      setForm(emptyForm);
      setShowForm(false);
      setError("");
      toast.success("Follow-up scheduled.");
    } catch (err) {
      const detail = err.response?.data?.details;
      setError(
        detail
          ? Object.values(detail)[0]
          : (err.response?.data?.error ?? "Could not schedule follow-up."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(followUp) {
    try {
      const updated = await updateFollowUp(followUp.id, {
        status: followUp.status === "done" ? "pending" : "done",
      });

      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not update follow-up.");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteFollowUp(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not delete follow-up.");
    }
  }

  async function handleNotify(followUp) {
    try {
      const result = await notifyFollowUp(followUp.id);

      if (result.sent) {
        toast.success("Reminder emailed.");
        return;
      }

      // Fall back to the user's own mail client, which always works.
      const mailto = result.mailto ?? buildMailtoForFollowUp(followUp, contact);

      if (mailto) {
        window.location.href = mailto;
        toast("Opened your mail app — server email is not configured.", { icon: "✉️" });
      } else {
        toast.error(result.reason ?? "No email address to send to.");
      }
    } catch (err) {
      const mailto = buildMailtoForFollowUp(followUp, contact);
      if (mailto) {
        window.location.href = mailto;
      } else {
        setError(err.response?.data?.error ?? "Could not send reminder.");
      }
    }
  }

  return (
    <section className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Follow-ups
        </h3>

        <Button size="sm" variant="secondary" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? "Cancel" : "Schedule"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="space-y-2">
            <label htmlFor="fu-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              What needs doing
            </label>
            <input
              id="fu-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Send revised quote"
              maxLength={120}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Type"
              name="type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {followUpTypeLabel(type)}
                </option>
              ))}
            </Select>

            <div className="space-y-2">
              <label htmlFor="fu-due" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Due date
              </label>
              <input
                id="fu-due"
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="fu-details" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Details (optional)
            </label>
            <textarea
              id="fu-details"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              rows={2}
              maxLength={1000}
              placeholder="Anything worth remembering before the call"
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <Button type="submit" fullWidth disabled={saving}>
            {saving ? "Scheduling..." : "Schedule follow-up"}
          </Button>
        </form>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Loading follow-ups...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Nothing scheduled. Add a follow-up so this does not get forgotten.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((followUp) => {
            const Icon = TYPE_ICONS[followUp.type] ?? Check;
            const done = followUp.status === "done";
            const overdue = isOverdue(followUp);
            const canDelete =
              currentUser?.role === "admin" || followUp.createdBy === currentUser?.id;

            return (
              <li
                key={followUp.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-2">
                  <Icon
                    size={15}
                    className="mt-0.5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        done
                          ? "text-slate-400 line-through dark:text-slate-500"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {followUp.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {followUpTypeLabel(followUp.type)} · due {followUp.dueAt}
                      {overdue && <span className="font-medium text-rose-600"> · overdue</span>}
                    </p>

                    {followUp.details && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {followUp.details}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleDone(followUp)}
                    aria-label={done ? "Mark as pending" : "Mark as done"}
                    className={`shrink-0 rounded-lg p-2 transition ${
                      done
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Check size={15} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const name = downloadIcsForFollowUp(followUp, { contact });
                      if (name) toast.success("Calendar file downloaded.");
                    }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <CalendarPlus size={14} />
                    Calendar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNotify(followUp)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Mail size={14} />
                    Email
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(followUp.id)}
                      aria-label="Delete follow-up"
                      className="ml-auto inline-flex min-h-11 items-center rounded-lg px-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default FollowUpsPanel;
