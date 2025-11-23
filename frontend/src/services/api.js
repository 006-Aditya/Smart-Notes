import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
});

// On page refresh — restore token automatically
const token = localStorage.getItem("token");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// Helper function if you're setting token after login
export function setToken(token) {
  localStorage.setItem("token", token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export default api;
