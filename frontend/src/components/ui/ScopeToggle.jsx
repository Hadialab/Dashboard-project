/**
 * All / Mine segmented control, shared by the Leads and Deals toolbars.
 *
 * Rendered as radio inputs rather than buttons so it is announced correctly and
 * reachable by keyboard, and so the current choice is real form state rather
 * than styling that only looks selected.
 *
 * "Mine" matches on ownerId, not on the display name — see utils/myWork.js.
 */
function ScopeToggle({ scope, onScopeChange, noun }) {
  const options = [
    { value: "all", label: `All ${noun}` },
    { value: "mine", label: `My ${noun}` },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={`Whose ${noun.toLowerCase()} to show`}
      className="inline-flex rounded-lg border border-slate-200 p-1 dark:border-slate-800"
    >
      {options.map((option) => {
        const selected = scope === option.value;

        return (
          <label
            key={option.value}
            className={[
              "flex min-h-9 cursor-pointer items-center rounded-md px-3 py-1.5 text-sm font-medium transition",
              selected
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            <input
              type="radio"
              name="scope"
              value={option.value}
              checked={selected}
              onChange={() => onScopeChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export default ScopeToggle;
