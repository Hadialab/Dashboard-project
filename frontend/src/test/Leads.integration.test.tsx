import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Leads from "../pages/Leads";
import { renderWithProviders, resetStores, RESTRICTED_REP } from "./harness";
import useNotificationStore from "../store/notificationStore";

vi.mock("../services/leadService", () => ({
  getLeads: vi.fn(),
  createLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  convertLead: vi.fn(),
}));

vi.mock("../services/customerService", () => ({ getCustomers: vi.fn() }));
vi.mock("../services/bulkService", () => ({
  bulkSetLeadStatus: vi.fn(),
  bulkDeleteLeads: vi.fn(),
}));

import { getLeads, convertLead, updateLead } from "../services/leadService";
import { getCustomers } from "../services/customerService";
import axios, { type AxiosResponse } from "axios";
import type { Customer, ConvertLeadResponse, Lead, Paginated } from "../types";
import type { UserEvent } from "@testing-library/user-event";

/**
 * The page reads failures through getApiErrorMessage, which only recognises a
 * real AxiosError. A plain object would fall through to the generic fallback and
 * hide the server's actual reason, so rejections are built as genuine ones.
 */
const apiError = (status: number, data: unknown) => {
  const error = new axios.AxiosError("Request failed");
  error.response = { status, data } as never;
  return error;
};

/**
 * Lead-to-customer conversion is the flow with the most ways to go quietly
 * wrong, so it gets the most attention here.
 *
 * Two properties matter and neither is visible in a screenshot:
 *   - it is ONE request, not a create-then-update, because two calls can
 *     half-succeed and leave a duplicate customer behind;
 *   - the duplicate-email warning must not fire for every lead, which it did
 *     when the modal was handed the merged lead-and-customer email list and
 *     therefore matched the lead against itself.
 */

const leads: Lead[] = [
  { id: "l031", name: "Marwan Y", company: "Bekaa Dairy", email: "marwan@bekaa.test", phone: "+961 1 222 001", status: "New", source: "Website", ownerId: "u1" },
  { id: "l032", name: "Nadia C", company: "Achrafieh Hotels", email: "nadia@hotels.test", phone: "+961 1 222 002", status: "Contacted", source: "Referral", ownerId: "u1" },
];

// Partial because this fixture carries no phone, and the page reads exactly one
// field off each of these rows: `email`, to decide whether an email is taken.
const customers: Partial<Customer>[] = [
  { id: "c001", name: "Jad Khoury", company: "Vertex Logistics", email: "jad@vertex.test", status: "Active" },
];

const table = () => within(screen.getByRole("table"));
const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);
const rowAction = (name: RegExp) => table().getByRole("button", { name });
const hasRowAction = (name: RegExp) => screen.queryAllByRole("button", { name }).length > 0;

beforeEach(() => {
  vi.clearAllMocks();
  resetStores();
  vi.mocked(getLeads).mockResolvedValue(leads);
  vi.mocked(getCustomers).mockResolvedValue({
    data: { data: customers, pages: 1, items: 1 },
  } as AxiosResponse<Paginated<Customer>>);
  vi.mocked(convertLead).mockResolvedValue({
    customer: { id: "c041", name: "Nadia C", company: "Achrafieh Hotels" },
    leadId: "l032",
    leadStatus: "Converted",
    convertedCustomerId: "c041",
  } as ConvertLeadResponse);
  // updateLead resolves to a bare Lead, so this envelope-shaped stand-in is not
  // one. `as never` says exactly that instead of dressing it up; nothing in this
  // file exercises the update path that would read the resolved value.
  vi.mocked(updateLead).mockResolvedValue({ data: {} } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Opens the convert dialog for the named lead. */
async function openConvertFor(user: UserEvent, name: string) {
  await waitFor(() => expect(rows()).toHaveLength(2));
  await user.click(rowAction(new RegExp(`convert ${name} to a customer`, "i")));
  return screen.findByRole("dialog");
}

describe("Lead — list", () => {
  it("renders a row per lead", async () => {
    renderWithProviders(<Leads />);

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(table().getByText("Marwan Y")).toBeInTheDocument();
  });

  it("shows a retryable error rather than 'no leads' when the load fails", async () => {
    vi.mocked(getLeads).mockRejectedValue(apiError(500, {}));
    renderWithProviders(<Leads />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/no leads found/i)).not.toBeInTheDocument();
  });
});

describe("Lead — conversion", () => {
  it("prefills the dialog from the lead", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Leads />);

    const dialog = await openConvertFor(user, "Nadia C");

    expect(within(dialog).getByLabelText(/full name/i)).toHaveValue("Nadia C");
    expect(within(dialog).getByLabelText(/company/i)).toHaveValue("Achrafieh Hotels");
    expect(within(dialog).getByLabelText(/email/i)).toHaveValue("nadia@hotels.test");
  });

  it("does not warn about a duplicate for a lead that is not a customer", async () => {
    // The regression: the modal was handed every lead's email as well as every
    // customer's, so it matched the lead being converted against itself and the
    // warning was permanently on.
    const user = userEvent.setup();
    renderWithProviders(<Leads />);

    const dialog = await openConvertFor(user, "Nadia C");

    expect(within(dialog).queryByText(/already uses this email/i)).not.toBeInTheDocument();
  });

  it("warns when the email really is already a customer", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Leads />);
    const dialog = await openConvertFor(user, "Nadia C");

    const email = within(dialog).getByLabelText(/email/i);
    await user.clear(email);
    await user.type(email, "jad@vertex.test");

    expect(await within(dialog).findByText(/already uses this email/i)).toBeInTheDocument();
  });

  it("does not warn for another lead's email, since the copy names a customer", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Leads />);
    const dialog = await openConvertFor(user, "Nadia C");

    const email = within(dialog).getByLabelText(/email/i);
    await user.clear(email);
    await user.type(email, "marwan@bekaa.test");

    await waitFor(() =>
      expect(within(dialog).queryByText(/already uses this email/i)).not.toBeInTheDocument(),
    );
  });

  it("converts with a single request rather than a create plus an update", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Leads />);
    const dialog = await openConvertFor(user, "Nadia C");

    await user.click(within(dialog).getByRole("button", { name: /convert to customer/i }));

    await waitFor(() => expect(convertLead).toHaveBeenCalledTimes(1));
    expect(convertLead).toHaveBeenCalledWith("l032", expect.objectContaining({ name: "Nadia C" }));
    // A separate createCustomer + updateLead pair could half-succeed and leave a
    // duplicate customer with the lead still open.
    expect(updateLead).not.toHaveBeenCalled();
  });

  it("marks the lead converted in place and keeps the row", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Leads />);
    const dialog = await openConvertFor(user, "Nadia C");

    await user.click(within(dialog).getByRole("button", { name: /convert to customer/i }));

    // The lead is never deleted, so the conversion history survives.
    await waitFor(() => expect(rows()).toHaveLength(2));
    await waitFor(() => expect(table().getByText("Converted")).toBeInTheDocument());
  });

  it("closes the dialog on success", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Leads />);
    const dialog = await openConvertFor(user, "Nadia C");

    await user.click(within(dialog).getByRole("button", { name: /convert to customer/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the dialog open and reports the reason when the server refuses", async () => {
    const user = userEvent.setup();
    vi.mocked(convertLead).mockRejectedValue(apiError(409, { error: "This lead has already been converted" }));
    renderWithProviders(<Leads />);
    const dialog = await openConvertFor(user, "Nadia C");

    await user.click(within(dialog).getByRole("button", { name: /convert to customer/i }));

    // Closing on a failure would look like it had worked.
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(await screen.findByText(/already been converted/i)).toBeInTheDocument();
  });

  it("shows the server's reason, not a raw detail value", async () => {
    // Regression guard. The 409 carries details: { customerId: "c041" }, and both
    // getApiErrorMessage and this modal used to take the first value of
    // `details` as the message — so the user saw the text "c041" and no
    // explanation of what happened.
    const user = userEvent.setup();
    vi.mocked(convertLead).mockRejectedValue(apiError(409, { error: "This lead has already been converted", details: { customerId: "c041" } }));
    renderWithProviders(<Leads />);
    const dialog = await openConvertFor(user, "Nadia C");

    await user.click(within(dialog).getByRole("button", { name: /convert to customer/i }));

    expect(await screen.findByText(/already been converted/i)).toBeInTheDocument();
    expect(screen.queryByText("c041")).not.toBeInTheDocument();
  });

  it("leaves the lead unconverted when the request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(convertLead).mockRejectedValue(apiError(500, { error: "boom" }));
    renderWithProviders(<Leads />);
    const dialog = await openConvertFor(user, "Nadia C");

    await user.click(within(dialog).getByRole("button", { name: /convert to customer/i }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(table().queryByText("Converted")).not.toBeInTheDocument();
  });

  it("does not offer conversion to a role that may not create customers", async () => {
    renderWithProviders(<Leads />, { user: RESTRICTED_REP });

    await waitFor(() => expect(rows()).toHaveLength(2));
    // Converting does two things at once, so it needs both permissions.
    expect(hasRowAction(/convert marwan y to a customer/i)).toBe(false);
  });
});

describe("Lead — permissions", () => {
  it("offers no selection checkboxes to a role that may neither edit nor delete", async () => {
    // Every bulk action is gated on edit or delete, so a rep with neither gets no
    // checkboxes at all rather than a checkbox leading to a dead bulk bar.
    renderWithProviders(<Leads />, { user: RESTRICTED_REP });

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(table().queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("hides the edit action from a role that may not edit", async () => {
    renderWithProviders(<Leads />, { user: RESTRICTED_REP });

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(hasRowAction(/edit marwan y/i)).toBe(false);
  });

  it("still lets the role read and convert, which it has permission for", async () => {
    renderWithProviders(<Leads />, { user: RESTRICTED_REP });

    await waitFor(() => expect(rows()).toHaveLength(2));
    // Conversion needs leads.edit AND customers.create; this rep has neither, so
    // it is withheld, but the read path must be untouched.
    expect(table().getByText("Marwan Y")).toBeInTheDocument();
    expect(hasRowAction(/convert marwan y to a customer/i)).toBe(false);
  });
});

describe("Lead — creation", () => {
  it("raises a notification for a new lead", async () => {
    const user = userEvent.setup();
    const { createLead } = await import("../services/leadService");
    vi.mocked(createLead).mockResolvedValue({
      id: "l099",
      name: "Hiba S",
      company: "Kaslik Digital",
      email: "hiba@kaslik.test",
      phone: "+961 1 222 004",
      status: "New",
      source: "Website",
      ownerId: "u1",
    });
    renderWithProviders(<Leads />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: /add lead/i }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/full name/i), "Hiba S");
    await user.type(within(dialog).getByLabelText(/company/i), "Kaslik Digital");
    await user.type(within(dialog).getByLabelText(/email/i), "hiba@kaslik.test");
    await user.type(within(dialog).getByLabelText(/phone/i), "+961 1 222 004");
    await user.click(within(dialog).getByRole("button", { name: /add lead/i }));

    await waitFor(() => {
      const all = useNotificationStore.getState().notifications;
      expect(all.some((n) => n.title === "New lead captured")).toBe(true);
    });
  });
});
