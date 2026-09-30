import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "../api/axios";
import {
  bulkSetCustomerStatus,
  bulkSetLeadStatus,
  bulkDeleteCustomers,
  bulkDeleteLeads,
} from "../services/bulkService";


/**
 * bulkService is the most consequential thing in the service layer: it issues
 * one request per row, so its accounting of what succeeded is the only thing
 * standing between a user and a wrong number on screen. These tests pin that
 * accounting, including the case that matters most — a run where some rows
 * succeed and some are refused.
 */

const customers = [
  { id: "c1", name: "Jad", company: "Vertex", status: "Active" },
  { id: "c2", name: "Sara", company: "Nova", status: "Active" },
  { id: "c3", name: "Rami", company: "Tyre", status: "Active" },
];

const leads = [
  { id: "l1", name: "Marwan", status: "New" },
  { id: "l2", name: "Nadia", status: "New" },
];

/** A rejected promise shaped like the axios error bulkService reads. */
const reject = (status, message) =>
  Promise.reject({ response: { status, data: { error: message } } });

beforeEach(() => {
  vi.clearAllMocks();
  api.put.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

describe("bulkSetCustomerStatus", () => {
  it("issues one PUT per record, sending the whole row with the new status", async () => {
    await bulkSetCustomerStatus(customers, "Inactive");

    expect(api.put).toHaveBeenCalledTimes(3);
    expect(api.put).toHaveBeenNthCalledWith(1, "/customers/c1", {
      id: "c1",
      name: "Jad",
      company: "Vertex",
      status: "Inactive",
    });
    expect(api.put).toHaveBeenNthCalledWith(3, "/customers/c3", expect.objectContaining({ status: "Inactive" }));
  });

  it("reports a clean run as all-succeeded", async () => {
    const result = await bulkSetCustomerStatus(customers, "Inactive");

    expect(result).toEqual({ ok: 3, failed: 0, errors: [] });
  });

  it("reports a partial run without rolling back the rows that worked", async () => {
    api.put.mockImplementation((url) =>
      url === "/customers/c2" ? reject(403, "You do not have permission") : Promise.resolve({ data: {} }),
    );

    const result = await bulkSetCustomerStatus(customers, "Inactive");

    expect(result.ok).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it("names the row that failed and carries the server's reason", async () => {
    api.put.mockImplementation((url) =>
      url === "/customers/c2" ? reject(403, "You do not have permission") : Promise.resolve({ data: {} }),
    );

    const result = await bulkSetCustomerStatus(customers, "Inactive");

    expect(result.errors[0]).toEqual({
      id: "c2",
      name: "Sara",
      message: "You do not have permission",
    });
  });

  it("falls back to a permission message when the server gives no reason", async () => {
    api.put.mockImplementation(() => Promise.reject(new Error("network down")));

    const result = await bulkSetCustomerStatus(customers, "Inactive");

    expect(result.errors[0].message).toMatch(/permission/i);
  });

  it("keeps going after a failure rather than stopping at the first one", async () => {
    let calls = 0;
    api.put.mockImplementation(() => {
      calls += 1;
      return calls === 1 ? reject(500, "boom") : Promise.resolve({ data: {} });
    });

    const result = await bulkSetCustomerStatus(customers, "Inactive");

    expect(api.put).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(2);
    expect(result.failed).toBe(1);
  });

  it("labels a row by title when it has no name", async () => {
    // Deals carry a title, not a name. The label must not read "undefined".
    api.put.mockImplementationOnce(() => reject(403, "nope"));

    const result = await bulkSetCustomerStatus([{ id: "d1", title: "Vertex Fleet" }], "Won");

    expect(result.errors[0].name).toBe("Vertex Fleet");
  });

  it("reports progress for every row, ending at the total", async () => {
    const seen = [];

    await bulkSetCustomerStatus(customers, "Inactive", (done, total) => seen.push([done, total]));

    expect(seen).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("is a clean no-op for an empty selection", async () => {
    const result = await bulkSetCustomerStatus([], "Inactive");

    expect(result).toEqual({ ok: 0, failed: 0, errors: [] });
    expect(api.put).not.toHaveBeenCalled();
  });

  it("counts every row as failed when every row is refused", async () => {
    api.put.mockImplementation(() => reject(403, "nope"));

    const result = await bulkSetCustomerStatus(customers, "Inactive");

    expect(result).toMatchObject({ ok: 0, failed: 3 });
  });
});

describe("bulkSetLeadStatus", () => {
  it("PUTs each lead", async () => {
    await bulkSetLeadStatus(leads, "Qualified");

    expect(api.put).toHaveBeenCalledTimes(2);
    expect(api.put).toHaveBeenNthCalledWith(1, "/leads/l1", expect.objectContaining({ status: "Qualified" }));
  });

  it("surfaces the 409 the server returns for a converted lead", async () => {
    // Conversion is one-way, so a bulk status change on a converted lead is
    // refused. The reason has to reach the user or the count looks arbitrary.
    api.put.mockImplementation((url) =>
      url === "/leads/l2" ? reject(409, "This lead has already been converted to customer c041") : Promise.resolve({ data: {} }),
    );

    const result = await bulkSetLeadStatus(leads, "Qualified");

    expect(result.failed).toBe(1);
    expect(result.errors[0].message).toContain("already been converted");
  });
});

describe("bulk deletes", () => {
  it("DELETEs each customer", async () => {
    await bulkDeleteCustomers(customers);

    expect(api.delete).toHaveBeenCalledTimes(3);
    expect(api.delete).toHaveBeenNthCalledWith(1, "/customers/c1");
  });

  it("DELETEs each lead", async () => {
    await bulkDeleteLeads(leads);

    expect(api.delete).toHaveBeenCalledTimes(2);
    expect(api.delete).toHaveBeenNthCalledWith(1, "/leads/l1");
  });

  it("counts a refused delete as failed", async () => {
    api.delete.mockImplementation(() => reject(403, "You do not have permission to delete"));

    const result = await bulkDeleteCustomers(customers);

    expect(result).toMatchObject({ ok: 0, failed: 3 });
  });

  it("does not send a body with the delete", async () => {
    await bulkDeleteCustomers([customers[0]]);

    expect(api.delete).toHaveBeenCalledWith("/customers/c1");
  });
});
