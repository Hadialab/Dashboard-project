/**
 * Determinate progress bar.
 *
 * `role="progressbar"` with the value exposed, so the import is not a spinner
 * that gives no idea how much is left on a 200-row file.
 */
function ProgressBar({ value = 0, total = 0, label = "Progress" }) {
  const safeTotal = Math.max(0, total);
  const percent = safeTotal === 0 ? 0 : Math.min(100, Math.round((value / safeTotal) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
    >
      <div
        className="h-full rounded-full bg-blue-600 transition-[width] duration-200"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default ProgressBar;
