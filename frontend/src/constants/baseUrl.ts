export const getBaseUrl = () =>
  (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  window.location.origin
