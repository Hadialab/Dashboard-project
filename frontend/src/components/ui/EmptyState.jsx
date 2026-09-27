// The single empty state for the app. Replaces five separate implementations
// that had drifted apart on title size and button styling.
function EmptyState({ title, description, buttonText, onClick, isSearchResult }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {buttonText && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {buttonText}
        </button>
      )}

      {isSearchResult && (
        <p className="mt-4 text-xs text-slate-400">
          Try a different search term or filter.
        </p>
      )}
    </div>
  );
}

export default EmptyState;
