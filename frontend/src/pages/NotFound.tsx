import { Link } from "react-router-dom";

/**
 * The catch-all route.
 *
 * A dashboard link rather than "go back": the URL that 404'd is the one the
 * browser's back button would return to, which is how someone lands in a loop.
 */
function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 text-center dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
        Error 404
      </p>

      <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
        Page not found
      </h1>

      <p className="mt-3 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        to="/dashboard"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export default NotFound;