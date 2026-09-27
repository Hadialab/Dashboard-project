import axios from "axios";

// Vite exposes VITE_* variables here. The default targets the local backend;
// override it in a .env file when pointing at a deployed API.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
