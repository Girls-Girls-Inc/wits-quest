import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import purgeCss from "vite-plugin-purgecss";

const isProduction = process.env.NODE_ENV === "production";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    isProduction &&
      purgeCss({
        content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
        safelist: {
          standard: [
            "active",
            "icon-button",
            "nav-button",
            "nav-button-icon",
            "signup-btn",
            "login-btn",
            "google-signup-btn",
            "toggle",
            "toggle-panel",
            "form-box",
            "container",
            "container-pass",
            "pass-forget",
            "line",
            "toast",
            "toast-success",
            "toast-error",
            "toast-loading",
          ],
        },
      }),
  ].filter(Boolean),
  server: {
    historyApiFallback: true,
  },
  build: {
    sourcemap: true,
  },
});
