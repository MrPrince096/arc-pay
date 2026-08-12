import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

/**
 * Builds ONLY the browser wallet-connect module (see
 * src/client/walletConnect.entry.ts) into a single IIFE script the server
 * serves as a static asset. This is the one place in the project that goes
 * through a bundler — Circle's App Kit + its dependency chain (viem,
 * abitype, zod) isn't meant to be loaded via a raw unbundled <script> tag.
 * The server itself stays plain tsx/node:http, no build step.
 */
export default defineConfig({
  build: {
    outDir: "src/server/static",
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("src/client/walletConnect.entry.ts", import.meta.url)),
      name: "ArcPayWalletBundle",
      formats: ["iife"],
      fileName: () => "wallet-bundle.js",
    },
  },
});
