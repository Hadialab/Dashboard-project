import axios from "axios";

const api = axios.create({
    baseURL: "https://6a59f205ad8332e75f01dc81.mockapi.io/",
    headers:{
        "Content-Type": "application/json",
    },
});

export default api;