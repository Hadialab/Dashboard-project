import { AlertTriangle, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shown when a list request fails, as distinct from EmptyState.
 *
 * The two are easy to confuse and must not be. A failed request leaves the page
 * with no rows, and rendering the empty state there tells the user they have no
 * records — which is a lie, and an inviting one: it points them at "add your
 * first" while the real problem is that the server is unreachable. So this says
 * what happened and offers a retry.
 */
type ErrorStateProps = {
  title?: ReactNode;
  /** Overrides the generic explanation below. */
  message?: ReactNode;
  /** Without this, no retry button renders — there is nothing to retry. */
  onRetry?: () => void;
  /** Disables the button and swaps its label, so a retry cannot be double-fired. */
  retrying?: boolean;
};

function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 px-4 py-12 text-center dark:border-red-900/60 dark:bg-red-950/20"
    >
      <AlertTriangle size={28} className="text-red-600 dark:text-red-400" aria-hidden="true" />

      <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-300">
        {message ??
          "We could not load this list. This is usually a connection or server problem, not a problem with your data."}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} aria-hidden="true" className={retrying ? "animate-spin" : undefined} />
          {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
