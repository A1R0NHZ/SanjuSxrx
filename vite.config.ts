import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Use node-server preset so Nitro outputs to .output/server/index.mjs,
      // which is what Render's start command expects.
      server: {
        preset: "node-server",
        plugins: ["./src/nitro-plugins/error-handler"],
      },
    }),
    react(),
  ],
});
