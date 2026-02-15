import {
  BACKEND_CONFIG_ERROR,
  buildBackendUrl,
  isBackendConfigured,
} from "../socket";

const isJsonResponse = (response) => {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json");
};

const looksLikeHtml = (value) => {
  return typeof value === "string" && value.trim().startsWith("<");
};

const parseResponseBody = async (response) => {
  if (isJsonResponse(response)) {
    return response.json();
  }

  const rawText = await response.text();
  return { __rawText: rawText };
};

const normalizeErrorMessage = (response, body) => {
  if (typeof body?.message === "string" && body.message.trim()) {
    return body.message;
  }

  if (typeof body?.error === "string" && body.error.trim()) {
    return body.error;
  }

  if (looksLikeHtml(body?.__rawText)) {
    return "Received HTML/404 from server. Check VITE_BACKEND_URL points to your backend.";
  }

  return `Request failed with status ${response.status}`;
};

export const apiFetch = async (path, options = {}) => {
  if (!isBackendConfigured) {
    throw new Error(BACKEND_CONFIG_ERROR);
  }

  const response = await fetch(buildBackendUrl(path), options);
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(normalizeErrorMessage(response, body));
  }

  if (Object.prototype.hasOwnProperty.call(body, "__rawText")) {
    throw new Error("Expected JSON response but received non-JSON from backend.");
  }

  return body;
};
