import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { initRoleWatcher } from "./roleWatcher";

const roleWatcherVerbose = import.meta.env.DEV;

await initRoleWatcher({ verbose: roleWatcherVerbose }); // sets window.__IS_MODERATOR__ + subscribes to auth changes

const root = createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
