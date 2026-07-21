import axios from "../api/axios";

export const getDeals = async () => {
  const response = await axios.get("/deals");
  return response.data;
};

export const createDeal = async (deal) => {
  const response = await axios.post("/deals", deal);
  return response.data;
};

export const updateDeal = async (id, deal) => {
  const response = await axios.put(`/deals/${id}`, deal);
  return response.data;
};

export const deleteDeal = async (id) => {
  await axios.delete(`/deals/${id}`);
};