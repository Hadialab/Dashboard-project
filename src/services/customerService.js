import api from "../api/axios";


export const getCustomers = (params = {}) => {
  const sortParam =
    params.sort && params.order === "desc" ? `-${params.sort}` : params.sort;

  return api.get("/customers", {
    params: {
      _page: Number(params.page) || 1,
      _per_page: Number(params.limit) || 10,
      _sort: sortParam,

      ...(params.status &&
        params.status !== "All" && {
          status: params.status,
        }),

      ...(params.search && {
        q: params.search,
      }),
    },
  });
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