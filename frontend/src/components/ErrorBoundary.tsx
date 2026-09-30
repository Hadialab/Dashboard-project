import { Component } from "react";
import { AlertTriangle, RefreshCcw, RotateCcw } from "lucide-react";

/**
 * Catches a render-time crash and shows a recoverable screen instead of a blank
 * white page.
 *
 * A class component because that is the only kind React supports for error
 * boundaries — there is no hook equivalent. Nothing else in this app needs one,
 * which is why there is exactly one.
 *
 * Two boundaries on purpose:
 *   - one wrapping the whole app, so nothing can blank the page;
 *   - one inside the layout, so a crash on a single page keeps the navigation
 *     and lets the user go somewhere else rather than reloading the app.
 *
 * "Try again" clears the error and re-renders, which fixes the very common case
 * of a component that threw because of a transient state. "Reload" is the
 * fallback when re-rendering hits the same crash.
 */

type Props = {
  children: React.ReactNode;
  /** What the user was trying to do, e.g. "the pipeline board". */
  label?: string;
  /** Shown instead of the full-app screen — a page-level crash. */
  variant?: "page" | "app";
  /** Called on every caught error, so error tracking can report it. */
  onError?: (error: Error, info: { componentStack?: string | null }) => void;
};

type State = { error: Error | null; info: { componentStack?: string | null } | null };

class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ info });

    // Reported rather than swallowed. A crash that nobody hears about is a crash
    // that ships, gets worse, and is discovered by a customer.
    console.error("[error-boundary]", error, info.componentStack);
    this.props.onError?.(error, info);
  }

  private handleTryAgain = () => {
    this.setState({ error: null, info: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    const { error, info } = this.state;
    const { children, label, variant = "page" } = this.props;

    if (!error) return children;

    const isAppScope = variant === "app";

    return (
      <div
        role="alert"
        className={
          isAppScope
            ? "flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950"
            : "flex min-h-64 items-center justify-center rounded-xl border border-red-200 bg-red-50/60 p-8 dark:border-red-900/60 dark:bg-red-950/20"
        }
      >
        <div className="max-w-lg text-center">
          <AlertTriangle
            size={isAppScope ? 40 : 28}
            className="mx-auto text-red-600 dark:text-red-400"
            aria-hidden="true"
          />

          <h1
            className={
              isAppScope
                ? "mt-4 text-2xl font-bold text-slate-900 dark:text-white"
                : "mt-3 text-lg font-semibold text-slate-900 dark:text-white"
            }
          >
            {label ? `Something went wrong on ${label}` : "Something went wrong"}
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This part of the app failed to load. The rest of your data is safe —
            nothing has been deleted.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Try again
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Reload the app
            </button>
          </div>

          {/* The message, but never the stack. A stack in the UI tells a user
              nothing and a screenshot of it tells an attacker a great deal. */}
          {error.message && (
            <p className="mt-6 break-words text-left font-mono text-xs text-slate-500 dark:text-slate-400">
              {error.message}
              {info?.componentStack ? (
                <details className="mt-2">
                  <summary className="cursor-pointer font-sans">Technical detail</summary>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap">
                    {info.componentStack}
                  </pre>
                </details>
              ) : null}
            </p>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
