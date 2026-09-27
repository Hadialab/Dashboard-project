import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createNote, deleteNote, getNotes } from "../../services/noteService";
import useAuthStore from "../../store/authStore";
import Button from "./Button";

// The activity timeline. One component used in both the customer and deal
// drawers, since a note is a note either way — only the parent record differs.
function NotesTimeline({ entityType, entityId }) {
  const currentUser = useAuthStore((state) => state.user);
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;

    try {
      setLoading(true);
      setNotes(await getNotes({ entityType, entityId }));
      setError("");
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = body.trim();
    if (!trimmed) return;

    try {
      setSaving(true);
      const created = await createNote({ entityType, entityId, body: trimmed });
      // Newest first, matching the server order.
      setNotes((prev) => [created, ...prev]);
      setBody("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.details?.body ?? err.response?.data?.error ?? "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not delete note.");
    }
  }

  return (
    <section className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        Activity
      </h3>

      <form onSubmit={handleSubmit} className="mt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Add a note about this record..."
          aria-label="New note"
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">{body.length}/2000</span>

          <Button type="submit" size="sm" disabled={saving || !body.trim()}>
            {saving ? "Saving..." : "Add note"}
          </Button>
        </div>
      </form>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading activity...</p>
      ) : notes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No notes yet. Anything logged here is visible to your team.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {notes.map((note) => {
            const canDelete = currentUser?.role === "admin" || note.authorId === currentUser?.id;

            return (
              <li
                key={note.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-100">
                      {note.body}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {note.authorName} · {formatWhen(note.createdAt)}
                    </p>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      aria-label="Delete note"
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// Relative for recent entries, absolute once "x days ago" stops being useful.
function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export default NotesTimeline;
