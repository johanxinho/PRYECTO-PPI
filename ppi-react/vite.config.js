import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

function spaFallback() {
  return {
    name: "spa-github-pages-fallback",
    closeBundle() {
      if (existsSync("dist/index.html")) copyFileSync("dist/index.html", "dist/404.html");
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  base: process.env.VITE_BASE || "/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
