import axios from "axios";
import {
  BACKEND_CONFIG_ERROR,
  BACKEND_URL,
  isBackendConfigured,
} from "../socket";

const API = axios.create({
  baseURL: isBackendConfigured ? `${BACKEND_URL}/api` : undefined,
});

API.interceptors.request.use((config) => {
  if (!isBackendConfigured) {
    return Promise.reject(new Error(BACKEND_CONFIG_ERROR));
  }

  return config;
});

export default API;
