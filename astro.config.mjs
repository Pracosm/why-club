// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: [
        "astro:runtime:dev-toolbar",
        "@astrojs/react",
        "@astrojs/cloudflare",
      ],
    },
  },
  adapter: cloudflare(),
});
