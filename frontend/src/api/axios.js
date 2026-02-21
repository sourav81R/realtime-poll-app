import axios from "axios";
import {
  BACKEND_CONFIG_ERROR,
  BACKEND_URL,
  isBackendConfigured,
} from "../socket";
import { beginGlobalLoading } from "../loading/loadingStore";

const API = axios.create({
  baseURL: isBackendConfigured ? `${BACKEND_URL}/api` : undefined,
});

API.interceptors.request.use((config) => {
  if (!isBackendConfigured) {
    return Promise.reject(new Error(BACKEND_CONFIG_ERROR));
  }

  const endLoading = beginGlobalLoading({
    type: "network",
    message: "Syncing with server...",
    minDuration: 300,
  });

  config.metadata = { ...(config.metadata || {}), endLoading };

  return config;
});

const completeRequestLoading = (config) => {
  const endLoading = config?.metadata?.endLoading;
  if (typeof endLoading === "function") {
    endLoading();
  }
};

API.interceptors.response.use(
  (response) => {
    completeRequestLoading(response.config);
    return response;
  },
  (error) => {
    completeRequestLoading(error?.config);
    return Promise.reject(error);
  }
);

export default API;
