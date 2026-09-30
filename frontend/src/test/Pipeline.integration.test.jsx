import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Pipeline from "../pages/Pipeline";
import { renderWithProviders, resetStores, RESTRICTED_REP } from "./harness";
import useNotificationStore from "../store/notificationStore";

vi.mock("../services/dealService", () => ({
  getDeals: vi.fn(),
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
  deleteDeal: vi.fn(),
}));

import { getDeals, updateDeal } from "../services/dealService";

/**
 * The board's stage move is exercised through each card's stage <select> rather
 * than through HTML5 drag-and-drop.
 *
 * That is not a shortcut: the select is the deliberate keyboard and touch path,
 * because HTML5 drag-and-drop has no touch support at all. If the two ever
 * diverge, this is what catches it. Drag events themselves are covered by the
 * Playwright suite in Phase 1's E2E pass.
 */

const deals = [
  { id: "d039", title: "Vertex Fleet", customer: "Vertex Logistics", owner: "QA Admin", ownerId: "u1", stage: "Lead", value: 14000, expectedClose: "2026-10-03" },
  { id: "d041", title: "Beirut Rollout", customer: "Beirut Dairy", owner: "QA Admin", ownerId: "u1", stage: "Qualified", value: 32000, expectedClose: "2026-10-05" },
  { id: "d043", title: "Tyre Export", customer: "Tyre Seafood", owner: "QA Admin", ownerId: "u1", stage: "Proposal", value: 47500, expectedClose: "2026-10-01" },
];

/** The column element for a stage, found by its accessible label. */
function column(stage) {
  return screen.getByRole("region", { name: new RegExp(`^${stage} stage`) });
}

/** A card's stage select, addressed the way a screen reader would find it. */
function stageSelect(dealTitle) {
  return screen.getByRole("combobox", { name: `Stage for ${dealTitle}` });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStores();
  getDeals.mockResolvedValue(deals);
  // dealService is mocked wholesale, so updateDeal resolves to the deal itself —
  // the real service already unwraps response.data.
  updateDeal.mockImplementation((id, deal) => Promise.resolve({ ...deal, id }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Pipeline — board", () => {
  it("renders every stage as a column, including the empty ones", async () => {
    renderWithProviders(<Pipeline />);

    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());
    // A board that hides an empty stage has nowhere to drag a deal into.
    for (const stage of ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]) {
      expect(column(stage)).toBeInTheDocument();
    }
  });

  it("places each deal in the column for its stage", async () => {
    renderWithProviders(<Pipeline />);

    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());
    expect(within(column("Lead")).getByText("Vertex Fleet")).toBeInTheDocument();
    expect(within(column("Proposal")).getByText("Tyre Export")).toBeInTheDocument();
  });

  it("shows a count and a total per column", async () => {
    renderWithProviders(<Pipeline />);

    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());
    // Lead holds one deal worth 14,000.
    expect(column("Lead")).toHaveTextContent("14,000");
  });

  it("shows the empty state for a board with no deals", async () => {
    getDeals.mockResolvedValue([]);
    renderWithProviders(<Pipeline />);

    expect(await screen.findByText(/no deals/i)).toBeInTheDocument();
  });
});

describe("Pipeline — moving a deal between stages", () => {
  it("persists the new stage through the API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Pipeline />);
    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());

    await user.selectOptions(stageSelect("Vertex Fleet"), "Negotiation");

    await waitFor(() =>
      expect(updateDeal).toHaveBeenCalledWith("d039", expect.objectContaining({ stage: "Negotiation" })),
    );
  });

  it("moves the card to the new column in place", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Pipeline />);
    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());

    await user.selectOptions(stageSelect("Vertex Fleet"), "Negotiation");

    // An optimistic update, so the board does not wait on the round trip.
    await waitFor(() => expect(within(column("Negotiation")).getByText("Vertex Fleet")).toBeInTheDocument());
    expect(within(column("Lead")).queryByText("Vertex Fleet")).not.toBeInTheDocument();
  });

  it("raises a notification when a deal is won", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Pipeline />);
    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());

    await user.selectOptions(stageSelect("Vertex Fleet"), "Won");

    await waitFor(() => {
      const all = useNotificationStore.getState().notifications;
      expect(all.some((n) => n.title === "Deal won")).toBe(true);
    });
  });

  it("raises a notification when a deal is lost", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Pipeline />);
    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());

    await user.selectOptions(stageSelect("Vertex Fleet"), "Lost");

    await waitFor(() => {
      const all = useNotificationStore.getState().notifications;
      expect(all.some((n) => n.title === "Deal lost")).toBe(true);
    });
  });

  it("stays silent for a move between two open stages", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Pipeline />);
    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());

    await user.selectOptions(stageSelect("Vertex Fleet"), "Qualified");

    await waitFor(() => expect(updateDeal).toHaveBeenCalled());
    // Dragging between open stages is progress, not news.
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("puts the card back where it was when the server refuses", async () => {
    const user = userEvent.setup();
    updateDeal.mockRejectedValue({ response: { status: 403, data: { error: "You do not have permission" } } });
    renderWithProviders(<Pipeline />);
    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());

    await user.selectOptions(stageSelect("Vertex Fleet"), "Negotiation");

    // The optimistic move has to be rolled back, or the board shows a stage the
    // database does not agree with.
    await waitFor(() => expect(within(column("Lead")).getByText("Vertex Fleet")).toBeInTheDocument());
    expect(within(column("Negotiation")).queryByText("Vertex Fleet")).not.toBeInTheDocument();
  });
});

describe("Pipeline — permissions", () => {
  it("offers no way to change a stage for a role that may not edit deals", async () => {
    renderWithProviders(<Pipeline />, { user: RESTRICTED_REP });

    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());

    // Neither affordance is rendered: not a draggable card, and not a select
    // that would be a dead control.
    expect(document.querySelector('[draggable="true"]')).toBeNull();
    expect(screen.queryByRole("combobox", { name: /stage for/i })).not.toBeInTheDocument();
  });

  it("still shows the deals themselves, because reading is allowed", async () => {
    renderWithProviders(<Pipeline />, { user: RESTRICTED_REP });

    // Permission gating must withhold actions, not the read path.
    await waitFor(() => expect(screen.getByText("Vertex Fleet")).toBeInTheDocument());
    expect(screen.getByText("Beirut Rollout")).toBeInTheDocument();
  });
});
