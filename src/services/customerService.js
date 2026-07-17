import api from "../api/axios";

export const getCustomers = () => {
  return api.get("/customers");
};

export const createCustomer = (customer) => {
  return api.post("/customers", customer);
};

export const updateCustomer = (id, customer) => {
  return api.put(`/customers/${id}`, customer);
};

export const deleteCustomer = (id) => {
  return api.delete(`/customers/${id}`);
};