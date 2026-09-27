import axios from "../api/axios";

export const getLeads = async ()=>{

const response = await axios.get("/leads");
return response.data;


};


export const createLead = async(lead)=>{
    const response = await axios.post("/leads",lead);
    return response.data;

};

export const updateLead = async (id, lead) => {
  const response = await axios.put(`/leads/${id}`, lead);
  return response.data;
};

export const deleteLead = async (id) => {
  await axios.delete(`/leads/${id}`);
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
export const convertLead = async (id, customer) => {
  const response = await axios.post(`/leads/${id}/convert`, customer);
  return response.data;
};