import api from "../api/axios";
import type { ConvertLeadResponse, Customer, Lead } from "../types";

export const getLeads = async (): Promise<Lead[]> => {
  const response = await api.get("/leads");
  return response.data;
};

export const createLead = async (lead: Partial<Lead>): Promise<Lead> => {
  const response = await api.post("/leads", lead);
  return response.data;
};

export const updateLead = async (id: string, lead: Partial<Lead>): Promise<Lead> => {
  const response = await api.put(`/leads/${id}`, lead);
  return response.data;
};

/** Resolves to nothing: the row is gone, so there is no record to hand back. */
export const deleteLead = async (id: string): Promise<void> => {
  await api.delete(`/leads/${id}`);
};

/**
 * Turns a lead into a customer.
 *
 * One request rather than a createCustomer followed by an updateLead. Two calls
 * can half-succeed — customer created, lead update rejected — leaving a duplicate
 * customer and a lead that still claims to be open. The server does both inside
 * a transaction and answers with the new customer, the lead id and its new
 * status.
 */
export const convertLead = async (
  id: string,
  customer: Partial<Customer>,
): Promise<ConvertLeadResponse> => {
  const response = await api.post(`/leads/${id}/convert`, customer);
  return response.data;
};
