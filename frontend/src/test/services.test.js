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
import { login, register, getCurrentUser } from "../services/authService";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../services/customerService";
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
} from "../services/leadService";
import { createDeal, updateDeal, deleteDeal } from "../services/dealService";
import { getNotes, createNote, deleteNote } from "../services/noteService";
import {
  getFollowUps,
  updateFollowUp,
  notifyFollowUp,
} from "../services/followUpService";
import {
  createUser,
  updateUserRole,
  updateUserPermissions,
  resetUserPermissions,
} from "../services/teamService";

/**
 * The service layer's contract with the API. Two things are worth pinning here
 * beyond "it calls the right URL":
 *
 *  - getCustomers translates the app's filter vocabulary into the API's query
 *    parameter names. A mismatch there silently returns the wrong page rather
 *    than failing, which is the hardest kind of bug to notice.
 *  - convertLead is one request, not a create-then-update. Two calls can
 *    half-succeed and leave a duplicate customer behind.
 */

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValue({ data: {} });
  api.put.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

describe("authService", () => {
  it("posts credentials to the login route", async () => {
    api.post.mockResolvedValue({ data: { token: "t", user: { id: 1 } } });

    const result = await login({ email: "a@b.test", password: "pw" });

    expect(api.post).toHaveBeenCalledWith("/auth/login", { email: "a@b.test", password: "pw" });
    expect(result.token).toBe("t");
  });

  it("sends organizationName explicitly on register", async () => {
    await register({ name: "QA", organizationName: "QA Corp", email: "a@b.test", password: "pw" });

    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      name: "QA",
      organizationName: "QA Corp",
      email: "a@b.test",
      password: "pw",
    });
  });

  it("unwraps the user from /auth/me", async () => {
    api.get.mockResolvedValue({ data: { user: { id: 7, role: "admin" } } });

    expect(await getCurrentUser()).toEqual({ id: 7, role: "admin" });
  });

  it("returns null for an invalid token so the caller clears the session", async () => {
    api.get.mockRejectedValue(new Error("401"));

    // Throwing here would leave a stale session in place.
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("customerService", () => {
  it("sends the API's underscore query parameter names, not the app's", async () => {
    await getCustomers({ page: 2, limit: 25, search: "Vertex", sort: "name", order: "asc" });

    expect(api.get).toHaveBeenCalledWith("/customers", {
      params: { _page: 2, _per_page: 25, _sort: "name", q: "Vertex" },
    });
  });

  it("negates the sort for descending order", async () => {
    await getCustomers({ sort: "company", order: "desc" });

    expect(api.get.mock.calls[0][1].params._sort).toBe("-company");
  });

  it("omits the status filter for the All option rather than sending it", async () => {
    await getCustomers({ status: "All" });

    expect(api.get.mock.calls[0][1].params).not.toHaveProperty("status");
  });

  it("sends a real status filter", async () => {
    await getCustomers({ status: "Inactive" });

    expect(api.get.mock.calls[0][1].params.status).toBe("Inactive");
  });

  it("defaults to page 1 and 10 per page", async () => {
    await getCustomers();

    expect(api.get.mock.calls[0][1].params).toMatchObject({ _page: 1, _per_page: 10 });
  });

  it("coerces a string page number rather than sending NaN", async () => {
    await getCustomers({ page: "3", limit: "50" });

    expect(api.get.mock.calls[0][1].params).toMatchObject({ _page: 3, _per_page: 50 });
  });

  it("CRUDs against the right URLs", async () => {
    await createCustomer({ name: "A" });
    await updateCustomer("c001", { name: "B" });
    await deleteCustomer("c001");

    expect(api.post).toHaveBeenCalledWith("/customers", { name: "A" });
    expect(api.put).toHaveBeenCalledWith("/customers/c001", { name: "B" });
    expect(api.delete).toHaveBeenCalledWith("/customers/c001");
  });
});

describe("leadService", () => {
  it("unwraps the array from the response", async () => {
    api.get.mockResolvedValue({ data: [{ id: "l1" }] });

    expect(await getLeads()).toEqual([{ id: "l1" }]);
  });

  it("CRUDs against the right URLs", async () => {
    await createLead({ name: "A" });
    await updateLead("l001", { status: "Contacted" });
    await deleteLead("l001");

    expect(api.post).toHaveBeenCalledWith("/leads", { name: "A" });
    expect(api.put).toHaveBeenCalledWith("/leads/l001", { status: "Contacted" });
    expect(api.delete).toHaveBeenCalledWith("/leads/l001");
  });

  it("converts with a single request", async () => {
    api.post.mockResolvedValue({ data: { customer: { id: "c041" }, leadStatus: "Converted" } });

    const result = await convertLead("l032", { name: "Nadia", company: "Hotels" });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith("/leads/l032/convert", { name: "Nadia", company: "Hotels" });
    expect(result.customer.id).toBe("c041");
    expect(result.leadStatus).toBe("Converted");
  });

  it("does not resolve to undefined where a caller might expect a record", async () => {
    // deleteLead returns nothing, unlike the others. Pinned so that stays a
    // deliberate choice rather than an accident.
    expect(await deleteLead("l001")).toBeUndefined();
  });
});

describe("dealService", () => {
  it("CRUDs against the right URLs", async () => {
    await createDeal({ title: "T" });
    await updateDeal("d001", { stage: "Won" });
    await deleteDeal("d001");

    expect(api.post).toHaveBeenCalledWith("/deals", { title: "T" });
    expect(api.put).toHaveBeenCalledWith("/deals/d001", { stage: "Won" });
    expect(api.delete).toHaveBeenCalledWith("/deals/d001");
  });
});

describe("noteService", () => {
  it("scopes a note read to one record", async () => {
    await getNotes({ entityType: "lead", entityId: "l032" });

    expect(api.get).toHaveBeenCalledWith("/notes", { params: { entityType: "lead", entityId: "l032" } });
  });

  it("sends the entity type with the body, so a note cannot be orphaned", async () => {
    await createNote({ entityType: "deal", entityId: "d039", body: "Called" });

    expect(api.post).toHaveBeenCalledWith("/notes", { entityType: "deal", entityId: "d039", body: "Called" });
  });

  it("deletes by id", async () => {
    await deleteNote("n093");

    expect(api.delete).toHaveBeenCalledWith("/notes/n093");
  });
});

describe("followUpService", () => {
  it("strips empty params rather than sending blanks", async () => {
    await getFollowUps({ entityType: "customer", entityId: "", status: undefined });

    expect(api.get).toHaveBeenCalledWith("/followups", { params: { entityType: "customer" } });
  });

  it("allows an unscoped list", async () => {
    await getFollowUps();

    expect(api.get).toHaveBeenCalledWith("/followups", { params: {} });
  });

  it("uses PATCH for a partial update", async () => {
    await updateFollowUp("f001", { status: "done" });

    expect(api.patch).toHaveBeenCalledWith("/followups/f001", { status: "done" });
  });

  it("returns the notify outcome so the caller can fall back to mailto", async () => {
    api.post.mockResolvedValue({ data: { sent: false, reason: "no provider", mailto: "mailto:x" } });

    const result = await notifyFollowUp("f001");

    expect(api.post).toHaveBeenCalledWith("/followups/f001/notify");
    expect(result.sent).toBe(false);
    expect(result.mailto).toBe("mailto:x");
  });
});

describe("teamService", () => {
  it("creates a user with exactly the four known fields", async () => {
    await createUser({ name: "Rep", email: "r@b.test", password: "pw", role: "rep" });

    expect(api.post).toHaveBeenCalledWith("/auth/users", {
      name: "Rep",
      email: "r@b.test",
      password: "pw",
      role: "rep",
    });
  });

  it("updates a role and permissions on their own routes", async () => {
    await updateUserRole("u2", "admin");
    await updateUserPermissions("u2", { leads: { edit: false } });
    await resetUserPermissions("u2");

    expect(api.patch).toHaveBeenNthCalledWith(1, "/auth/users/u2/role", { role: "admin" });
    expect(api.patch).toHaveBeenNthCalledWith(2, "/auth/users/u2/permissions", {
      permissions: { leads: { edit: false } },
    });
    expect(api.post).toHaveBeenCalledWith("/auth/users/u2/permissions/reset");
  });
});
