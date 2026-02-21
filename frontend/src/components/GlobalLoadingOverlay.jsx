import { useSyncExternalStore } from "react";
import { getLoadingSnapshot, subscribeLoading } from "../loading/loadingStore";

export default function GlobalLoadingOverlay() {
  const { isVisible, message } = useSyncExternalStore(
    subscribeLoading,
    getLoadingSnapshot,
    getLoadingSnapshot
  );

  if (!isVisible) return null;

  return (
    <div className="global-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="global-loading-card">
        <div className="global-loader" aria-hidden="true">
          <span className="global-loader-ring global-loader-ring-a" />
          <span className="global-loader-ring global-loader-ring-b" />
          <span className="global-loader-core" />
        </div>
        <p className="global-loading-title">{message}</p>
        <p className="global-loading-subtitle">Please wait a moment...</p>
      </div>
    </div>
  );
}
