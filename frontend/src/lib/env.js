// frontend/src/lib/env.js
// Thin wrapper around Vite's import.meta.env so app code can import from one place.
// In Vite runtime this reads import.meta.env; in Jest tests we will mock this module.
const env = (typeof import.meta !== "undefined" && typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};

// Export named constants and default for convenience
export const VITE_WEB_URL = env.VITE_WEB_URL || "";
export default { VITE_WEB_URL };
