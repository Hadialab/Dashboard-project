import type { AxiosResponse } from "axios";

import api from "../api/axios";
import type { Customer, ListResponse, Paginated } from "../types";

/** The filter vocabulary the Customers page uses, in its own names. */
export type CustomerQuery = {
  page?: number | string;
  limit?: number | string;
  search?: string;
  /** "All" means no filter, and is deliberately not sent. */
  status?: string;
  sort?: string;
  order?: "asc" | "desc" | string;
};

/**
 * The list request.
 *
 * Translates the page's filter vocabulary into the API's query parameter names.
 * A mismatch here does not fail — it silently returns the wrong page — which is
 * the hardest kind of bug to notice, so the mapping is pinned by a test.
 */
export const getCustomers = (
  params: CustomerQuery = {},
): Promise<AxiosResponse<Paginated<Customer>>> => {
  // Descending is expressed by prefixing the field with a minus.
  const sortParam = params.sort && params.order === "desc" ? `-${params.sort}` : params.sort;

  return api.get("/customers", {
    params: {
      _page: Number(params.page) || 1,
      _per_page: Number(params.limit) || 10,
      _sort: sortParam,

      ...(params.status && params.status !== "All" && { status: params.status }),

      ...(params.search && { q: params.search }),
    },
  });
};

/**
 * Unwraps a list response that may be paginated or bare.
 *
 * Both shapes are real: the API wraps when asked with `_page`/`_per_page` and
 * returns a bare array otherwise, and callers in this app read both.
 */
export const unwrapList = <T>(response: { data: ListResponse<T> }): T[] => {
  const body = response.data;
  return Array.isArray(body) ? body : (body?.data ?? []);
};

export const createCustomer = (customer: Partial<Customer>): Promise<AxiosResponse<Customer>> =>
  api.post("/customers", customer);

export const updateCustomer = (
  id: string,
  customer: Partial<Customer>,
): Promise<AxiosResponse<Customer>> => api.put(`/customers/${id}`, customer);

export const deleteCustomer = (id: string): Promise<AxiosResponse<unknown>> =>
  api.delete(`/customers/${id}`);
