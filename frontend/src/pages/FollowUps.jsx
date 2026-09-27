import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarPlus, Check, Mail, Users } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import { getFollowUps, notifyFollowUp, updateFollowUp } from "../services/followUpService";
import { downloadIcsForFollowUp, buildMailtoForFollowUp, followUpTypeLabel, isOverdue } from "../utils/calendar";
import api from "../api/axios";
import { getApiErrorMessage } from "../utils/apiError";

const FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

const TYPE_ICONS = { call: Users, email: Mail, meeting: Users, task: Check };

// Every follow-up the signed-in user can see, across all records. The API
// already scopes this, so a sales rep only ever gets their own.
function FollowUps() {
  const [items, setItems] = useState([]);
  const [contacts, setContacts] = useState({});
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await getFollowUps());
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load follow-ups."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Follow-ups reference their parent by id only, so resolve the labels and
  // contact addresses separately.
  useEffect(() => {
    if (items.length === 0) return;

    (async () => {
      try {
        const [customers, deals] = await Promise.all([
          api.get("/customers"),
          api.get("/deals"),
        ]);

        const byId = {
          ...Object.fromEntries(customers.data.map((c) => [`customer:${c.id}`, c])),
          ...Object.fromEntries(deals.data.map((d) => [`deal:${d.id}`, d])),
        };

        setContacts(byId);
      } catch {
        // Labels are a nicety; the list is still usable without them.
      }
    })();
  }, [items]);

  const visible = items.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const overdueCount = items.filter(isOverdue).length;

  async function toggleDone(followUp) {
    try {
      const updated = await updateFollowUp(followUp.id, {
        status: followUp.status === "done" ? "pending" : "done",
      });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update that follow-up."));
    }
  }

  async function handleNotify(followUp) {
    const parent = contacts[`${followUp.entityType}:${followUp.entityId}`];

    try {
      const result = await notifyFollowUp(followUp.id);

      if (result.sent) {
        toast.success("Reminder emailed.");
        return;
      }

      // Fall back to the user's own mail client, built locally if the server
      // did not supply one.
      const mailto = result.mailto ?? buildMailtoForFollowUp(followUp, parent);

      if (mailto) {
        window.location.href = mailto;
        toast("Opened your mail app — server email is not configured.", { icon: "✉️" });
      } else {
        toast.error(result.reason ?? "No email address to send to.");
      }
    } catch {
      toast.error("Could not send that reminder.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description={
          overdueCount > 0
            ? `Everything scheduled, with ${overdueCount} overdue.`
            : "Everything scheduled across your customers and deals."
        }
        action={
          <Select
            name="statusFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter follow-ups by status"
            className="min-h-11 sm:w-40"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        }
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center px-4 py-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {filter === "pending" ? "Nothing pending" : "Nothing here"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {filter === "pending"
              ? "You are all caught up. Schedule follow-ups from a customer or deal to keep track of what is next."
              : "No follow-ups match this filter."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((followUp) => {
            const parent = contacts[`${followUp.entityType}:${followUp.entityId}`];
            const Icon = TYPE_ICONS[followUp.type] ?? Check;
            const done = followUp.status === "done";
            const overdue = isOverdue(followUp);
            const parentLabel =
              parent?.name ?? parent?.title ?? `${followUp.entityType} ${followUp.entityId}`;

            return (
              <li key={followUp.id}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-medium ${
                          done
                            ? "text-slate-400 line-through dark:text-slate-500"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {followUp.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {parentLabel} · {followUpTypeLabel(followUp.type)} · due{" "}
                        {followUp.dueAt}
                        {overdue && (
                          <span className="ml-1 font-medium text-rose-600">· overdue</span>
                        )}
                      </p>

                      {followUp.details && (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {followUp.details}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDone(followUp)}
                      aria-label={done ? "Mark as pending" : "Mark as done"}
                      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg transition ${
                        done
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Check size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={CalendarPlus}
                      onClick={() => {
                        const name = downloadIcsForFollowUp(followUp, {
                          contact: parent?.email ? parent : null,
                        });
                        if (name) toast.success("Calendar file downloaded.");
                      }}
                    >
                      Calendar
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Mail}
                      onClick={() => handleNotify(followUp)}
                    >
                      Email
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default FollowUps;
