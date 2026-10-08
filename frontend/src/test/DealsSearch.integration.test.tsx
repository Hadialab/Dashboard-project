import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Deals from "../pages/Deals";
import { renderWithProviders, resetStores } from "./harness";

vi.mock("../services/dealService", () => ({
  getDeals: vi.fn(),
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
  deleteDeal: vi.fn(),
}));

import { getDeals } from "../services/dealService";
import type { Deal } from "../types";

/**
 * Searching the deals list must survive a deal with no owner.
 *
 * `deals.owner` is a nullable column in the database — a deal can be unassigned,
 * and `owner_id` is `ON DELETE SET NULL`, so deleting the assigned user unassigns
 * every one of their deals at once. The list read `deal.owner.toLowerCase()`
 * unguarded, so a single unassigned deal made the whole search filter throw a
 * TypeError and take the page down with it.
 *
 * The fixture below deliberately includes one unassigned deal. It is the only
 * thing these tests assert, and it is the shape that broke.
 */
const deals: Deal[] = [
  { id: "d039", title: "Vertex Fleet", customer: "Vertex Logistics", owner: "QA Admin", ownerId: "u1", stage: "Lead", value: 14000 },
  // No owner, no ownerId. This is what the database returns for an unassigned deal.
  { id: "d040", title: "Unassigned Pilot", customer: "Acme Industrial", stage: "Lead", value: 5000 },
  { id: "d041", title: "Beirut Rollout", customer: "Beirut Dairy", owner: "QA Admin", ownerId: "u1", stage: "Qualified", value: 32000 },
];

/**
 * The list renders twice: a table above `md` and a card list below it, so a deal's
 * title appears in both. Counted rather than asserted present, because "at least
 * one" is what these tests mean and `getByText` throws on the second match.
 */
function occurrencesOf(title: string) {
  return screen.queryAllByText(title).length;
}

/**
 * The search box, by accessible name.
 *
 * It had no name until this test went looking: the input carried only a
 * placeholder, which is not an accessible name because it disappears the moment
 * the field has a value — so a screen reader reaching the field mid-session had
 * nothing to announce.
 *
 * Role `textbox`, not `searchbox`: the implicit role of `type="text"`. The
 * `searchbox` role belongs to `type="search"`, which this input is not.
 */
function searchBox() {
  return screen.getByRole("textbox", { name: "Search deals" });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStores();
  vi.mocked(getDeals).mockResolvedValue(deals);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Deals — searching a list containing an unassigned deal", () => {
  it("renders every deal when nothing is searched, including the unassigned one", async () => {
    renderWithProviders(<Deals />);

    await waitFor(() => expect(occurrencesOf("Vertex Fleet")).toBeGreaterThan(0));
    expect(occurrencesOf("Unassigned Pilot")).toBeGreaterThan(0);
    expect(occurrencesOf("Beirut Rollout")).toBeGreaterThan(0);
  });

  it("filters without throwing when only the unassigned deal can match", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Deals />);
    await waitFor(() => expect(occurrencesOf("Vertex Fleet")).toBeGreaterThan(0));

    // "Acme" matches only the unassigned deal, so this filter has to read
    // `deal.owner` on all three rows to decide that.
    await user.type(searchBox(), "Acme");

    await waitFor(() => expect(occurrencesOf("Unassigned Pilot")).toBeGreaterThan(0));
    expect(occurrencesOf("Vertex Fleet")).toBe(0);
  });

  it("still matches on the owner when there is one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Deals />);
    await waitFor(() => expect(occurrencesOf("Vertex Fleet")).toBeGreaterThan(0));

    await user.type(searchBox(), "QA Admin");

    await waitFor(() => expect(occurrencesOf("Vertex Fleet")).toBeGreaterThan(0));
    expect(occurrencesOf("Beirut Rollout")).toBeGreaterThan(0);
    // An absent owner matches no query, so the unassigned deal is dropped.
    expect(occurrencesOf("Unassigned Pilot")).toBe(0);
  });

  it("drops every row for a query nothing matches, rather than throwing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Deals />);
    await waitFor(() => expect(occurrencesOf("Vertex Fleet")).toBeGreaterThan(0));

    await user.type(searchBox(), "zzz");

    // Nothing matches, so every row is dropped — but reading them to find that
    // out must not have thrown on the way.
    await waitFor(() => expect(occurrencesOf("Vertex Fleet")).toBe(0));
    expect(occurrencesOf("Unassigned Pilot")).toBe(0);
  });
});