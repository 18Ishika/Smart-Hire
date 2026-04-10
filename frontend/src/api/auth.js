import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((req) => {
  const token = localStorage.getItem("access");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

export const signupUser = (data) => {
  return api.post(`/api/users/signup/`, data);
};

export const loginUser = (data) => {
  return api.post(`/api/users/login/`, data);
};

export const getProfile = () => {
  return api.get(`/api/users/profile/`);
};

// ✅ ADD THIS LINE
export default api;