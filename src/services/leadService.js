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