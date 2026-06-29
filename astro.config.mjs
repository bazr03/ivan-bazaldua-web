// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Update this to your production domain before deploying.
  site: "https://ivanbazaldua.com",
  integrations: [sitemap()],
  build: {
    inlineStylesheets: "auto",
  },
});
