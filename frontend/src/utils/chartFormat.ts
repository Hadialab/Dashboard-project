/**
 * Number formatting for chart axes and tooltips.
 *
 * Axis labels are the narrowest text in the app — a Y axis gets 30-50 pixels and
 * a 10px font — so they cannot afford a formatter that produces six characters
 * where two will do. Recharts will not shrink or truncate a tick itself; it
 * renders whatever string it is given, so a raw `125000` becomes a label that
 * runs off the axis and is clipped into something meaningless.
 *
 * The clip is worth dwelling on because it is silent and reads as a data
 * problem: a Revenue axis showing `,00`, `0`, `,00`, `0` looks like a bug in the
 * calculation rather than in the label, and someone spends an afternoon on the
 * wrong one.
 */

/**
 * A short money label for an axis tick.
 *
 * `125000` becomes `$125k`. Precision is deliberately dropped — an axis is for
 * reading magnitude, and the exact figure is in the tooltip and the export. The
 * breakpoint at 10k is because below that `$1250` still fits, and switching to
 * `$1.3k` earlier than needed loses resolution where the numbers are small enough
 * to be worth reading exactly.
 */
export function formatAxisMoney(value: number): string {
  if (!Number.isFinite(value)) return "";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    // One decimal, but only when it carries information: "$1.2M" yes,
    // "$1.0M" no — the trailing zero is noise that makes every value look
    // slightly different from the one next to it.
    const millions = abs / 1_000_000;
    return `${sign}$${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (abs >= 10_000) {
    const thousands = abs / 1000;
    return `${sign}$${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}k`;
  }

  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

/**
 * The full figure, for a tooltip or a table cell.
 *
 * The counterpart to formatAxisMoney: same number, no abbreviation, because
 * here there is room and the reader is looking at one value rather than
 * comparing a column of them.
 */
export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

/**
 * A compact count for an axis tick. Deals-per-stage counts are small, so this
 * only abbreviates past a thousand.
 */
export function formatAxisCount(value: number): string {
  if (!Number.isFinite(value)) return "";

  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${Math.round(abs / 1_000_000)}M`;
  if (abs >= 10_000) return `${Math.round(abs / 1000)}k`;

  return String(Math.round(abs));
}
