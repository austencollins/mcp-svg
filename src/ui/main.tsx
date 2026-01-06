import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./fonts.css";
import "./App.css";

/**
 * React Entry Point
 *
 * Mounts the Todo List app into the DOM.
 * This runs inside an iframe hosted by the MCP Apps host.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

