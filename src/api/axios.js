import axios from "axios";

const api = axios.create({
  baseURL: "https://dashboard-project-ryn2.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;