/// <reference types="vitest" />

import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import { resolve } from "path";

const rootDir = resolve(__dirname);

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000
  },
  test: {
    environment: "jsdom",
    transformMode: { web: [/\.[jt]sx?$/] },
    // otherwise, solid would be loaded twice:
    deps: { registerNodeLoader: true },
    // if you have few tests, try commenting one
    // or both out to improve performance:
    threads: false,
    isolate: false
  },
  resolve: {
    conditions: ["development", "browser"],
    alias: {
      rxcore: [resolve(rootDir, "packages/solid/web/src/core")],
      "solid-js/jsx-runtime": [resolve(rootDir, "packages/solid/src/jsx")],
      "solid-js/web": [resolve(rootDir, "packages/solid/web/src")],
      "solid-js": [resolve(rootDir, "packages/solid/src")]
    }
  }
});
