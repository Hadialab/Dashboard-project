// A small inline spinner. Used where a full loading state would be overkill —
// inside a button, a dropdown, a search panel.
function Spinner({ size = 16, className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default Spinner;
