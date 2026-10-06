import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import AuditLogPage from "../pages/AuditLog";
import axios from "axios";

import { AUDIT_ACTIONS } from "../types";
import { ACTION_LABELS } from "../components/audit/AuditFilterBar";
import { getAuditLog } from "../services/auditService";

/**
 * A real AxiosError, not a plain object.
 *
 * `normalizeError` branches on `axios.isAxiosError`, so a hand-rolled
 * `{ response: { status } }` would be classified as "unknown" rather than
 * forbidden, and the page would render the wrong state — the test would pass for
 * the wrong reason.
 */
const makeApiError = (status: number, error: string) => {
  const failure = new axios.AxiosError("Request failed");
  failure.response = { status, data: { error } } as never;

  return failure;
};

// The page is the only place that knows how the three pieces fit together — the
// filters, the URL, and the table — so it is the piece worth testing. The
// components it renders are presentational and covered by rendering them here
// rather than in isolation.

vi.mock("../services/auditService", () => ({
  getAuditLog: vi.fn(),
}));

const mockGetAuditLog = vi.mocked(getAuditLog);

// Entry fixture. entityLabel defaults to a real name because that is the common
// case; the tests that care about the fallback pass it as null explicitly.
const entry = (over: Record<string, unknown> = {}) => ({
  id: "1",
  actorId: 7,
  actorName: "Nadia Labbassi",
  action: "update",
  entityType: "customer",
  entityId: "c041",
  entityLabel: "Acme Contact",
  changes: { email: { from: "old@test.local", to: "new@test.local" } },
  createdAt: "2026-10-05T14:22:00Z",
  ...over,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/audit"]}>
      <Routes>
        <Route path="/audit" element={<AuditLogPage />} />
        {/* A stub so a record link has somewhere to go and does not 404 the test. */}
        <Route path="/customers/:id" element={<div>customer detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockGetAuditLog.mockReset();
});

describe("AuditLogPage", () => {
  it("renders one row per entry", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [
        entry(),
        entry({ id: "2", action: "delete", changes: { name: { from: "Acme", to: null } } }),
      ],
      total: 2,
      limit: 50,
      offset: 0,
      actors: [{ id: 7, name: "Nadia Labbassi" }],
    });

    renderPage();

    // Scoped to the table: the same name also appears in the actor filter's
    // options, so an unscoped findAllByText would match three nodes and the
    // assertion would fail on the count rather than on the rows.
    const table = await screen.findByRole("table");
    expect(within(table).getAllByText("Nadia Labbassi")).toHaveLength(2);
    expect(within(table).getByText("Deleted")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
  });

  it("reports the total alongside the rows", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [entry()],
      total: 137,
      limit: 50,
      offset: 0,
      actors: [],
    });

    renderPage();

    // The row count and the total disagreeing is the bug this guards: the page
    // must not claim "showing 1 of 1" when 137 entries match. Matched with a
    // function because the line is built from several interpolated values, which
    // testing-library sees as more than one text node.
    await screen.findByText((_, node) => node?.textContent === "Showing 1–1 of 137");
  });

  it("collapses the change detail until it is asked for", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [entry()],
      total: 1,
      limit: 50,
      offset: 0,
      actors: [],
    });

    renderPage();

    const toggle = await screen.findByRole("button", { name: "Show changes" });
    expect(screen.queryByText(/new@test\.local/)).not.toBeInTheDocument();

    await userEvent.click(toggle);

    // The cell reads "old@test.local → new@test.local" as one string, so the two
    // values are asserted through the cell rather than as separate nodes.
    await screen.findByText(/new@test\.local/);
    expect(screen.getByText(/old@test\.local/)).toBeInTheDocument();
  });

  it("renders null on either side as a dash, not as the word null", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [entry({ action: "delete", changes: { owner: { from: "Nadia", to: null } } })],
      total: 1,
      limit: 50,
      offset: 0,
      actors: [],
    });

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Show changes" }));

    // A literal "null" in a table cell reads as a bug to whoever is auditing.
    expect(await screen.findByText(/Nadia → —/)).toBeInTheDocument();
    expect(screen.queryByText(/→ null/)).not.toBeInTheDocument();
  });

  it("says an entry from a deleted account is from a deleted account", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [entry({ actorId: null })],
      total: 1,
      limit: 50,
      offset: 0,
      actors: [{ id: null, name: "Former Colleague" }],
    });

    renderPage();

    // The entry outliving its author is the whole reason actor_name is
    // denormalised, so the UI has to say so rather than show a blank actor.
    expect(await screen.findByText("(account removed)")).toBeInTheDocument();
  });

  it("labels every action the API can send", async () => {
    // A missing label renders as a blank badge rather than an error, so this would
    // not fail loudly — the audit view would just silently omit an action. The
    // regression it guards: `password_change` was added to the API's CHECK
    // constraint without being added here.
    mockGetAuditLog.mockResolvedValue({
      entries: AUDIT_ACTIONS.map((action, index) =>
        entry({ id: String(index), action, changes: {} }),
      ),
      total: AUDIT_ACTIONS.length,
      limit: 50,
      offset: 0,
      actors: [],
    });

    renderPage();

    const table = await screen.findByRole("table");
    for (const action of AUDIT_ACTIONS) {
      expect(within(table).getByText(ACTION_LABELS[action]), `for "${action}"`).toBeInTheDocument();
    }
  });

it("shows the record's name, not only its id", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [entry()],
      total: 1,
      limit: 50,
      offset: 0,
      actors: [],
    });

    renderPage();

    // The whole reason entityLabel is denormalised onto the row: an auditor
    // scanning the log should recognise a record without looking it up. The id
    // stays visible so a renamed record can still be traced back.
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Acme Contact")).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "c041" })).toBeInTheDocument();
  });

  it("falls back to the id alone when a record has no usable name", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [entry({ entityLabel: null })],
      total: 1,
      limit: 50,
      offset: 0,
      actors: [],
    });

    renderPage();

    // Null rather than an empty span: an audit log that renders a blank gap reads
    // as a bug, and inventing a placeholder would be worse still.
    const table = await screen.findByRole("table");
    expect(within(table).getByText("c041")).toBeInTheDocument();
    expect(within(table).queryByRole("link")).not.toBeInTheDocument();
  });

  it("offers only actors who have entries, including removed accounts", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [entry()],
      total: 1,
      limit: 50,
      offset: 0,
      actors: [
        { id: 7, name: "Nadia Labbassi" },
        { id: null, name: "Former Colleague" },
      ],
    });

    renderPage();

    const filter = await screen.findByRole("combobox", { name: /who/i });
    const options = within(filter).getAllByRole("option");

    expect(options.map((o) => o.textContent)).toEqual([
      "Anyone",
      "Nadia Labbassi",
      "Former Colleague (account removed)",
    ]);
  });

  it("reports a filter matching nothing as a filter result, not an empty log", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [],
      total: 0,
      limit: 50,
      offset: 0,
      actors: [],
    });

    render(
      <MemoryRouter initialEntries={["/audit?action=delete"]}>
        <Routes>
          <Route path="/audit" element={<AuditLogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // The two are genuinely different: one says nobody has done anything yet, the
    // other says nobody matched. Offering "add your first customer" in the second
    // case would be nonsense.
    expect(await screen.findByText("Nothing matches those filters")).toBeInTheDocument();
    expect(screen.getByText("Try a different search term or filter.")).toBeInTheDocument();
  });

  it("says the log is for administrators when the API refuses", async () => {
    mockGetAuditLog.mockRejectedValue(makeApiError(403, "This action requires an administrator"));

    renderPage();

    expect(await screen.findByText("This log is for administrators")).toBeInTheDocument();
    // A retry button on a 403 would be a dead end.
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("renders no filter bar when the API refuses, not a row of dead controls", async () => {
    mockGetAuditLog.mockRejectedValue(makeApiError(403, "This action requires an administrator"));

    renderPage();

    await screen.findByText("This log is for administrators");
    // Offering filters for a log that cannot be read is a row of controls that
    // cannot do anything.
    expect(screen.queryByRole("combobox", { name: /who/i })).not.toBeInTheDocument();
    // And no table at all — not an empty one, which would read as "nothing has
    // happened yet" rather than "you may not look".
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

it("offers a retry for a failure a retry could fix", async () => {
    mockGetAuditLog.mockRejectedValueOnce(makeApiError(500, "Internal error"));
    mockGetAuditLog.mockResolvedValueOnce({
      entries: [entry()],
      total: 1,
      limit: 50,
      offset: 0,
      actors: [],
    });

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /try again/i }));

    await waitFor(() => expect(screen.getByText("Nadia Labbassi")).toBeInTheDocument());
  });

  it("sends the date range the filter bar collected", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [],
      total: 0,
      limit: 50,
      offset: 0,
      actors: [],
    });

    renderPage();

    const from = await screen.findByLabelText("From");
    await userEvent.type(from, "2026-10-01");

    await waitFor(() =>
      expect(mockGetAuditLog).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: "2026-10-01" }),
      ),
    );
  });

  it("returns to the first page when a filter changes", async () => {
    mockGetAuditLog.mockResolvedValue({
      entries: [entry()],
      total: 200,
      limit: 50,
      offset: 0,
      actors: [],
    });

    render(
      <MemoryRouter initialEntries={["/audit?offset=100"]}>
        <Routes>
          <Route path="/audit" element={<AuditLogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Nadia Labbassi");

    // The page was asked for offset 100, and it requested exactly that. Asserting
    // on the request rather than on the rendered range, because the rendered
    // range depends on how many rows came back and this mock returns one.
    expect(mockGetAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 100 }));
    // And paging back is offered rather than being a dead end.
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();

    const action = await screen.findByRole("combobox", { name: /action/i });
    await userEvent.selectOptions(action, "delete");

    // Narrowing while on page 3 would otherwise show an empty page, which reads
    // as "your filter found nothing" rather than "page 3 is past the end".
    await waitFor(() =>
      expect(mockGetAuditLog).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: "delete", offset: 0 }),
      ),
    );
  });

  it("does not render a stale response after the filters change", async () => {
    // The first request is slower than the second. Without the cleanup guard the
    // first response lands last and overwrites the newer one.
    let resolveFirst: (value: unknown) => void = () => {};

    mockGetAuditLog
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({
        entries: [entry({ id: "9", entityId: "c999" })],
        total: 1,
        limit: 50,
        offset: 0,
        actors: [],
      });

    renderPage();

    const action = await screen.findByRole("combobox", { name: /action/i });
    await userEvent.selectOptions(action, "delete");

    // c999 is rendered as a link beside the words "Customer", so it is matched as
    // its own element rather than as the row's whole text.
    await screen.findByRole("button", { name: "c999" });

    resolveFirst({
      entries: [entry({ id: "1", entityId: "c041" })],
      total: 1,
      limit: 50,
      offset: 0,
      actors: [],
    });

    await waitFor(() => expect(screen.queryByRole("button", { name: "c041" })).not.toBeInTheDocument());
  });
});