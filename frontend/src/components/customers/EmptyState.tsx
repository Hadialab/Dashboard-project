import { Plus, SearchX } from "lucide-react";

// One empty state for the app. The shared primitive carries the title,
// description and button; this only supplies the illustration so each list can
// show something relevant to its entity.
function EmptyState({ title, description, buttonText, onClick, isSearchResult = false }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          isSearchResult
            ? "bg-amber-100 dark:bg-amber-900/20"
            : "bg-blue-100 dark:bg-blue-900/20"
        }`}
      >
        {isSearchResult ? (
          <SearchX size={28} className="text-amber-600 dark:text-amber-400" />
        ) : (
          <Plus size={28} className="text-blue-600 dark:text-blue-400" />
        )}
      </div>

      <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>

      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>

      {buttonText && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
        >
          <Plus size={18} />
          {buttonText}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
