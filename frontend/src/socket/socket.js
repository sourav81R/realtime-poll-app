import io from 'socket.io-client';

const DEFAULT_DEV_BACKEND_URL = "http://localhost:5000";
const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL;
const fallbackBackendUrl = import.meta.env.DEV
  ? DEFAULT_DEV_BACKEND_URL
  : window.location.origin;

export const BACKEND_URL = (
  configuredBackendUrl || fallbackBackendUrl
).replace(/\/+$/, "");

export const socket = io(BACKEND_URL, {
  autoConnect: true,
});
