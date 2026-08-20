export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const forzar = new URLSearchParams(window.location.search).get("sw") === "1";
  if (process.env.NODE_ENV !== "production" && !forzar) return;
  void navigator.serviceWorker.register("/sw.js");
}
