import api from "../api/axios";
import type { Deal } from "../types";

export const getDeals = async (): Promise<Deal[]> => {
  const response = await api.get("/deals");
  return response.data;
};

export const createDeal = async (deal: Partial<Deal>): Promise<Deal> => {
  const response = await api.post("/deals", deal);
  return response.data;
};

export const updateDeal = async (id: string, deal: Partial<Deal>): Promise<Deal> => {
  const response = await api.put(`/deals/${id}`, deal);
  return response.data;
};

/** Resolves to nothing: the row is gone, so there is no record to hand back. */
export const deleteDeal = async (id: string): Promise<void> => {
  await api.delete(`/deals/${id}`);
};
