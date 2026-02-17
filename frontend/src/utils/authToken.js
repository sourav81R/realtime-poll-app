export function getRoleFromToken(token) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalizedPayload = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "="
    );
    const decoded = atob(normalizedPayload);
    const parsed = JSON.parse(decoded);

    return typeof parsed?.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}
