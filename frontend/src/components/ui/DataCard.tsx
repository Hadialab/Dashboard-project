import type { ReactNode } from "react";

/**
 * Small helper for the detail rows inside a Drawer or a details Modal, so
 * customer / lead / deal details all use the same label-value rhythm.
 */
type DetailRowProps = {
  label: ReactNode;
  /**
   * Nullish renders an em dash rather than an empty cell.
   *
   * Worth being explicit about why: an empty `<dd>` is invisible next to a
   * populated one, and a table of details with a few missing fields reads as
   * "nothing here" rather than "not recorded". The em dash says the field
   * exists and has no value.
   */
  value?: ReactNode;
};

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>

      <dd className="min-w-0 break-words text-sm text-slate-900 dark:text-slate-100">
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default DetailRow;
