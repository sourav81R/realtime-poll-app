import io from 'socket.io-client';

const DEFAULT_DEV_BACKEND_URL = "http://localhost:5000";
const configuredBackendUrl = (import.meta.env.VITE_BACKEND_URL || "").trim();

export const BACKEND_URL = (
  configuredBackendUrl || (import.meta.env.DEV ? DEFAULT_DEV_BACKEND_URL : "")
).replace(/\/+$/, "");

export const BACKEND_CONFIG_ERROR =
  "Backend URL is not configured. Set VITE_BACKEND_URL in frontend environment variables.";

export const isBackendConfigured = Boolean(BACKEND_URL);

const noopSocket = {
  connected: false,
  on: () => {},
  off: () => {},
  emit: () => {},
  connect: () => {},
  disconnect: () => {},
};

export const buildBackendUrl = (path = "") => {
  if (!isBackendConfigured) {
    throw new Error(BACKEND_CONFIG_ERROR);
  }

  if (!path) return BACKEND_URL;
  return path.startsWith("/") ? `${BACKEND_URL}${path}` : `${BACKEND_URL}/${path}`;
};

export const socket = isBackendConfigured
  ? io(BACKEND_URL, {
      autoConnect: false,
    })
  : noopSocket;
