import { useCallback, useEffect, useState } from "react";
import { Activity, Trash2 } from "lucide-react";
import type { FormEvent } from "react";

import { createNote, deleteNote, getNotes } from "../../services/noteService";
import useAuthStore from "../../store/authStore";
import Button from "./Button";
import { formatRelative } from "../../utils/time";
import { getApiErrorMessage, normalizeError } from "../../utils/apiError";
import type { Note, NoteEntityType } from "../../types";

/**
 * The activity timeline for a record.
 *
 * One component used in the customer, lead and deal drawers, since a note is a
 * note either way — only the parent record differs.
 *
 * Two kinds of entry share the list:
 *   note  — typed by a person, deletable by its author
 *   event — written by the server when the record was created or a tracked
 *           field changed, shown with an icon and not deletable
 *
 * They are interleaved chronologically rather than separated, because the story
 * of a record is the combination: "stage moved to Negotiation" only makes sense
 * next to the note written just before it.
 */
type NotesTimelineProps = {
  /**
   * Which table the parent record lives in. The union rather than `string`,
   * because noteService already demands it — a timeline for a table that cannot
   * hold notes is a mistake worth catching at the call site.
   */
  entityType?: NoteEntityType | null;
  entityId?: string | null;
};

/** Server-side cap, mirrored so the counter cannot disagree with the API. */
const MAX_LENGTH = 2000;

function NotesTimeline({ entityType, entityId }: NotesTimelineProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    // A timeline with no parent has nothing to load. Returning early rather than
    // requesting a malformed id also leaves `loading` false, so the empty state
    // shows instead of a spinner that never resolves.
    if (!entityType || !entityId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setNotes(await getNotes({ entityType, entityId }));
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load activity."));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = body.trim();
    if (!trimmed) return;

    try {
      setSaving(true);
      const created = await createNote({ entityType: entityType!, entityId: entityId!, body: trimmed });
      // Prepended rather than re-fetched: the server's row is authoritative, and
      // a refetch here would make the newly typed note flash before appearing.
      setNotes((prev) => [created, ...prev]);
      setBody("");
      setError("");
    } catch (err) {
      // A 400 carries a per-field message, and for a textarea that is far more
      // useful than the generic "error" alongside it.
      const fieldError = normalizeError(err).fieldErrors?.body;
      setError(fieldError ?? getApiErrorMessage(err, "Could not save note."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete note."));
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
          maxLength={MAX_LENGTH}
          placeholder="Add a note about this record..."
          aria-label="New note"
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {body.length}/{MAX_LENGTH}
          </span>

          <Button type="submit" size="sm" disabled={saving || !body.trim()}>
            {saving ? "Saving..." : "Add note"}
          </Button>
        </div>
      </form>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Loading activity...
        </p>
      ) : notes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No activity yet. Anything logged here is visible to your team.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {notes.map((note) => {
            const isEvent = note.kind === "event";
            // Events are part of the record's history and are not deletable by
            // anyone, admin included.
            const canDelete =
              !isEvent &&
              (currentUser?.role === "admin" || note.authorId === currentUser?.id);

            return (
              <li
                key={note.id}
                className={[
                  "rounded-lg border p-3",
                  isEvent
                    ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {isEvent && (
                      <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Activity size={12} aria-hidden="true" />
                        Change
                      </p>
                    )}

                    <p
                      className={[
                        "break-words text-sm",
                        isEvent
                          ? "text-slate-600 dark:text-slate-300"
                          : "text-slate-800 dark:text-slate-100",
                      ].join(" ")}
                    >
                      {note.body}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {note.authorName} · {formatRelative(note.createdAt)}
                    </p>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      aria-label="Delete note"
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} aria-hidden="true" />
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

export default NotesTimeline;