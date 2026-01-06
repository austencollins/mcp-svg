import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";
import fs from "fs";

/**
 * Plugin to copy static HTML files to dist.
 * Used for the confirmation.html which doesn't need React.
 */
function copyStaticHtml(): Plugin {
  return {
    name: "copy-static-html",
    writeBundle() {
      const srcPath = path.resolve(__dirname, "src/ui/confirmation.html");
      const destPath = path.resolve(__dirname, "dist/ui/confirmation.html");
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log("Copied confirmation.html to dist/ui/");
      }
    },
  };
}

/**
 * Vite Configuration for MCP Template UI
 *
 * Builds the React app into a single HTML file that can be served
 * as an MCP Apps UI resource. The singlefile plugin inlines all
 * JS and CSS into the HTML for self-contained delivery.
 */
export default defineConfig({
  plugins: [
    react(),
    // Inline all assets into HTML for MCP Apps resource delivery
    viteSingleFile(),
    // Copy static HTML files (confirmation.html)
    copyStaticHtml(),
  ],
  root: path.resolve(__dirname, "src/ui"),
  build: {
    outDir: path.resolve(__dirname, "dist/ui"),
    emptyOutDir: true,
    // Ensure we get a single index.html output
    rollupOptions: {
      output: {
        // Single bundle, no code splitting
        manualChunks: undefined,
      },
    },
  },
  // Dev server configuration for HMR
  server: {
    // Allow connections from Electron iframe
    cors: true,
    // Needed for HMR through iframe
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});

