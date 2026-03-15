import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const signupUser = (data) => {
  return axios.post(`${API}/api/users/signup/`, data);
};

export const loginUser = (data) => {
  return axios.post(`${API}/api/users/login/`, data);
};  