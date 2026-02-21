import { buildBackendUrl } from "../socket";
import { beginGlobalLoading } from "../loading/loadingStore";

const WARM_UP_TIMEOUT_MS = 45000;

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      mode: "no-cors",
      credentials: "omit",
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Server is taking too long to wake up. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const startGoogleOAuth = async () => {
  const warmupUrl = buildBackendUrl("/");
  const oauthUrl = buildBackendUrl("/api/auth/google");

  const endLoading = beginGlobalLoading({
    type: "network",
    message: "Connecting to Google sign-in...",
    minDuration: 350,
  });

  try {
    const response = await fetchWithTimeout(warmupUrl, WARM_UP_TIMEOUT_MS);
    if (response.type !== "opaque" && !response.ok) {
      throw new Error("Unable to connect to server. Please try again.");
    }

    window.location.assign(oauthUrl);
  } finally {
    endLoading();
  }
};
