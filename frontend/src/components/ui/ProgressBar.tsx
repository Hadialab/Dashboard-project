/**
 * Determinate progress bar.
 *
 * `role="progressbar"` with the value exposed, so the import is not a spinner
 * that gives no idea how much is left on a 200-row file.
 */
type ProgressBarProps = {
  /** Rows done so far. */
  value?: number;
  /** Rows in total. Zero or absent renders an empty bar rather than dividing by zero. */
  total?: number;
  /** Announced to a screen reader, so it must say what is being imported. */
  label?: string;
};

function ProgressBar({ value = 0, total = 0, label = "Progress" }: ProgressBarProps) {
  // Clamped on both sides. A count above the total happens for real when the
  // server reports a different number of rows than the file appeared to have,
  // and an unbounded width would push the fill outside the track.
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
