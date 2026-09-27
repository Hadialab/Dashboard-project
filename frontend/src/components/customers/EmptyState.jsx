import { Users, Plus, SearchX } from "lucide-react";

function EmptyState({
  title,
  description,
  buttonText,
  onClick,
  isSearchResult = false,
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full ${
            isSearchResult
              ? "bg-amber-100 dark:bg-amber-900/20"
              : "bg-blue-100 dark:bg-blue-900/20"
          }`}
        >
          {isSearchResult ? (
            <SearchX
              size={40}
              className="text-amber-600 dark:text-amber-400"
            />
          ) : (
            <Users
              size={40}
              className="text-blue-600 dark:text-blue-400"
            />
          )}
        </div>

        <h2 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>

        <button
          onClick={onClick}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          {buttonText}
        </button>
      </div>
    </div>
  );
}

export default EmptyState;