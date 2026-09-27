/**
 * The checkbox used for row selection in the Customers and Leads tables.
 *
 * The native input is visually hidden rather than replaced, so it keeps its
 * keyboard behaviour, its place in the tab order and its checked state for
 * assistive technology. A styled span draws the box and the tick.
 */
function RowCheckbox({ checked, indeterminate = false, onChange, label, disabled }) {
  return (
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        // A mixed state cannot be expressed by `checked` alone, so it is set on
        // the DOM node directly. React will not clobber it on the next render
        // because `checked` is left under React's control.
        ref={(node) => {
          if (node) node.indeterminate = !checked && indeterminate;
        }}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        aria-label={label}
        className="peer sr-only"
      />

      <span
        aria-hidden="true"
        className={[
          "flex h-4 w-4 items-center justify-center rounded border transition",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2",
          checked || indeterminate
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
        ].join(" ")}
      >
        {indeterminate ? (
          <span className="h-0.5 w-2 rounded bg-white" />
        ) : checked ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path
              d="M2 6.5l2.5 2.5L10 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    </label>
  );
}

export default RowCheckbox;
