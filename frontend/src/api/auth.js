import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// ✅ create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// ✅ attach token automatically
api.interceptors.request.use((req) => {
  const token = localStorage.getItem("access");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

// ✅ signup
export const signupUser = (data) => {
  return api.post(`/api/users/signup/`, data);
};

// ✅ login
export const loginUser = (data) => {
  return api.post(`/api/users/login/`, data);
};
export const getProfile = () => {
  return api.get(`/api/users/profile/`);
};
