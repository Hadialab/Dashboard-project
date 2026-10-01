import { describe, it, expect } from "vitest";

import { formatAxisCount, formatAxisMoney, formatMoney } from "../utils/chartFormat";

/**
 * These exist because of a bug the screenshots caught, which is worth recording
 * since it is invisible in code review: the Revenue Trend Y axis rendered `,00`
 * and `0`. Recharts does not shrink or ellipsise a tick label — it renders the
 * string it is given and lets the 30px axis clip it — so a raw `125000` lost its
 * first and last characters and read as a broken calculation rather than a
 * broken label.
 *
 * So the property being pinned here is that an axis label is SHORT, not that it
 * is accurate. Accuracy is the tooltip's job.
 */

describe("formatAxisMoney", () => {
  it("abbreviates thousands, which is the case the axis was clipping", () => {
    expect(formatAxisMoney(125000)).toBe("$125k");
    expect(formatAxisMoney(48000)).toBe("$48k");
    expect(formatAxisMoney(26500)).toBe("$27k");
  });

  it("abbreviates millions", () => {
    expect(formatAxisMoney(1_500_000)).toBe("$1.5M");
    expect(formatAxisMoney(12_000_000)).toBe("$12M");
  });

  it("keeps a decimal only where it carries information", () => {
    // "$1.0M" and "$1.5M" next to each other: the first's trailing zero is noise
    // that makes every value look subtly different from its neighbour.
    expect(formatAxisMoney(1_000_000)).toBe("$1M");
    expect(formatAxisMoney(1_040_000)).toBe("$1M");
    expect(formatAxisMoney(1_050_000)).toBe("$1.1M");
  });

  it("keeps small values exact, because there is room for them", () => {
    // Switching to "$1.3k" below 10k throws away resolution where the number was
    // short enough to read exactly.
    expect(formatAxisMoney(0)).toBe("$0");
    expect(formatAxisMoney(750)).toBe("$750");
    expect(formatAxisMoney(9999)).toBe("$9,999");
  });

  it("keeps the sign outside the currency symbol", () => {
    // Not "$-50,000", which is not how anything is written.
    expect(formatAxisMoney(-50000)).toBe("-$50k");
  });

  it("keeps a negative value exact too, below the abbreviation threshold", () => {
    expect(formatAxisMoney(-2500)).toBe("-$2,500");
  });

  it("never returns a label too long for an axis", () => {
    // The property that actually matters, asserted directly rather than implied
    // by the examples: whatever the input, the output is short.
    for (const value of [0, 1, 999, 9999, 10_000, 125_000, 1e6, 1e9, -4e6]) {
      expect(formatAxisMoney(value).length).toBeLessThanOrEqual(6);
    }
  });

  it("returns nothing rather than NaN for a value it cannot format", () => {
    // "NaN" on an axis is worse than a blank: it reads as data.
    expect(formatAxisMoney(Number.NaN)).toBe("");
    expect(formatAxisMoney(Number.POSITIVE_INFINITY)).toBe("");
  });
});

describe("formatMoney", () => {
  it("keeps the cents, which is the point of having a separate formatter", () => {
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatMoney(0.99)).toBe("$0.99");
  });

  it("drops the decimals on a whole figure rather than padding with zeros", () => {
    expect(formatMoney(125000)).toBe("$125,000");
  });

  it("reads as an em dash for a value that is not a number", () => {
    // A missing value is visibly missing, not silently zero.
    expect(formatMoney(Number.NaN)).toBe("—");
  });
});

describe("formatAxisCount", () => {
  it("leaves small counts alone", () => {
    expect(formatAxisCount(0)).toBe("0");
    expect(formatAxisCount(7)).toBe("7");
    expect(formatAxisCount(999)).toBe("999");
  });

  it("abbreviates only past ten thousand, since deal counts are small", () => {
    // A stage with 2,500 deals is not a stage anyone has, and "2500" fits an
    // axis. Abbreviating early would throw away resolution for nothing.
    expect(formatAxisCount(2500)).toBe("2500");
    expect(formatAxisCount(25_000)).toBe("25k");
    expect(formatAxisCount(1_500_000)).toBe("2M");
  });

  it("returns nothing for a value it cannot format", () => {
    expect(formatAxisCount(Number.NaN)).toBe("");
  });
});
