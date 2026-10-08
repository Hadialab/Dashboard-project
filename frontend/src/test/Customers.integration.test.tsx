import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Customers from "../pages/Customers";
import { renderWithProviders, resetStores, RESTRICTED_REP } from "./harness";

vi.mock("../services/customerService", () => ({
  getCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

vi.mock("../services/dealService", () => ({ createDeal: vi.fn() }));
vi.mock("../services/bulkService", () => ({
  bulkSetCustomerStatus: vi.fn(),
  bulkDeleteCustomers: vi.fn(),
}));

import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../services/customerService";
import axios, { type AxiosResponse } from "axios";
import type { Customer, Paginated } from "../types";

/**
 * Failures reach the page through getApiErrorMessage, which only recognises a
 * real AxiosError, so rejections are built as genuine ones.
 */
const apiError = (status: number, data: unknown) => {
  const error = new axios.AxiosError("Request failed");
  error.response = { status, data } as never;
  return error;
};

/**
 * The customer list is the app's main table, so its create/edit/delete cycle is
 * the flow most worth pinning end to end at the component level.
 *
 * The API is mocked, not stubbed at the network layer, so these tests assert on
 * what the page asks the service to do and what it renders afterwards. The
 * service layer's own contract is covered separately in services.test.js.
 */

const listResponse = (rows: Customer[]) =>
  ({ data: { data: rows, pages: 1, items: rows.length } }) as AxiosResponse<Paginated<Customer>>;

const customers: Customer[] = [
  { id: "c001", name: "Jad Khoury", company: "Vertex Logistics", email: "jad@vertex.test", phone: "+961 1 111 001", status: "Active", updatedAt: "2026-09-28T10:00:00Z" },
  { id: "c002", name: "Sara Mansour", company: "Nova Analytics", email: "sara@nova.test", phone: "+961 1 111 002", status: "Pending", updatedAt: "2026-09-27T10:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  resetStores();
  vi.mocked(getCustomers).mockResolvedValue(listResponse(customers));
  vi.mocked(createCustomer).mockResolvedValue({ data: { id: "c003" } } as AxiosResponse<Customer>);
  vi.mocked(updateCustomer).mockResolvedValue({ data: { id: "c001" } } as AxiosResponse<Customer>);
  vi.mocked(deleteCustomer).mockResolvedValue({ data: {} } as AxiosResponse<unknown>);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * The table renders a desktop row layout and a mobile card layout from the same
 * data, so a customer's name legitimately appears twice in the DOM. Queries are
 * scoped to the table where a single match is needed.
 */
const table = () => within(screen.getByRole("table"));
const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

/**
 * Row action buttons exist in both the desktop table and the mobile card layout,
 * so they must be looked up inside the table rather than across the page.
 */
const rowAction = (name: RegExp) => table().getByRole("button", { name });

/** Asserts a row action is absent from the whole page, for the permission tests. */
const hasRowAction = (name: RegExp) => screen.queryAllByRole("button", { name }).length > 0;

describe("Customers — list", () => {
  it("renders a row per customer returned by the API", async () => {
    renderWithProviders(<Customers />);

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(table().getByText("Jad Khoury")).toBeInTheDocument();
    expect(table().getByText("Nova Analytics")).toBeInTheDocument();
  });

  it("asks the service for the first page with the app's filter names", async () => {
    renderWithProviders(<Customers />);

    await waitFor(() => expect(getCustomers).toHaveBeenCalled());
    expect(vi.mocked(getCustomers).mock.calls[0][0]).toMatchObject({ page: 1, limit: expect.any(Number) });
  });

  it("shows a retryable error, not an empty list, when the load fails", async () => {
    // A dead API must not read as "you have no customers".
    vi.mocked(getCustomers).mockRejectedValue(apiError(500, {}));
    renderWithProviders(<Customers />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load customers/i);
    expect(screen.queryByText(/no customers match/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("re-fetches when the error is retried", async () => {
    const user = userEvent.setup();
    vi.mocked(getCustomers).mockRejectedValue(apiError(500, {}));
    renderWithProviders(<Customers />);

    await screen.findByRole("alert");

    vi.mocked(getCustomers).mockResolvedValue(listResponse(customers));
    await user.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the empty state for a genuinely empty account", async () => {
    vi.mocked(getCustomers).mockResolvedValue(listResponse([]));
    renderWithProviders(<Customers />);

    expect(await screen.findByText(/no customers/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Customers — create", () => {
  it("hides Add Customer from a role that may not create", async () => {
    renderWithProviders(<Customers />, { user: RESTRICTED_REP });

    await waitFor(() => expect(getCustomers).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /add customer/i })).not.toBeInTheDocument();
  });

  it("opens the modal and posts the typed values", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /add customer/i }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/full name/i), "Nadine C");
    await user.type(within(dialog).getByLabelText(/company/i), "Beirut Dairy");
    await user.type(within(dialog).getByLabelText(/email/i), "nadine@dairy.test");
    await user.type(within(dialog).getByLabelText(/phone/i), "+961 1 111 004");
    await user.click(within(dialog).getByRole("button", { name: /^add customer$/i }));

    await waitFor(() =>
      expect(createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Nadine C", company: "Beirut Dairy", email: "nadine@dairy.test" }),
      ),
    );
  });

  it("blocks submission and explains why when required fields are empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /add customer/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^add customer$/i }));

    expect(await within(dialog).findByText(/name is required/i)).toBeInTheDocument();
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it("warns but does not block when the email is already in use", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /add customer/i }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/full name/i), "Someone Else");
    await user.type(within(dialog).getByLabelText(/company/i), "Dup Co");
    await user.type(within(dialog).getByLabelText(/email/i), "jad@vertex.test");
    await user.type(within(dialog).getByLabelText(/phone/i), "+961 1 111 009");

    expect(await within(dialog).findByText(/already uses this email/i)).toBeInTheDocument();
  });
});

describe("Customers — edit", () => {
  it("opens the modal prefilled with the row's values", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(rowAction(/edit jad khoury/i));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByLabelText(/full name/i)).toHaveValue("Jad Khoury");
    expect(within(dialog).getByLabelText(/email/i)).toHaveValue("jad@vertex.test");
  });

  it("PUTs the whole row with the change", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(rowAction(/edit jad khoury/i));
    const dialog = await screen.findByRole("dialog");
    const company = within(dialog).getByLabelText(/company/i);
    await user.clear(company);
    await user.type(company, "Vertex Renamed");
    await user.click(within(dialog).getByRole("button", { name: /save|update/i }));

    await waitFor(() =>
      expect(updateCustomer).toHaveBeenCalledWith("c001", expect.objectContaining({ company: "Vertex Renamed" })),
    );
  });

  it("hides the row actions from a role that may not edit", async () => {
    renderWithProviders(<Customers />, { user: RESTRICTED_REP });

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(hasRowAction(/edit jad khoury/i)).toBe(false);
    expect(hasRowAction(/delete jad khoury/i)).toBe(false);
  });
});

describe("Customers — delete", () => {
  it("asks for confirmation naming the record", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(rowAction(/delete jad khoury/i));
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent(/jad khoury/i);
    expect(deleteCustomer).not.toHaveBeenCalled();
  });

  it("deletes only after the confirmation is accepted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(rowAction(/delete jad khoury/i));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete customer$/i }));

    await waitFor(() => expect(deleteCustomer).toHaveBeenCalledWith("c001"));
  });

  it("leaves the record alone when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(rowAction(/delete jad khoury/i));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteCustomer).not.toHaveBeenCalled();
  });

  it("keeps the row when the delete is refused by the server", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteCustomer).mockRejectedValue(apiError(403, { error: "You do not have permission" }));
    renderWithProviders(<Customers />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(rowAction(/delete jad khoury/i));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete customer$/i }));

    // A failed delete must not make the row disappear, or the user believes
    // something was removed that was not.
    await waitFor(() => expect(rows()).toHaveLength(2));
  });
});
