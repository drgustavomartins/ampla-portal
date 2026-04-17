import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: "/",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — shared by everything, cached long-term
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react";
          }
          // TanStack React Query — used on most pages
          if (id.includes("node_modules/@tanstack/")) {
            return "tanstack";
          }
          // Radix UI primitives — shared UI toolkit
          if (id.includes("node_modules/@radix-ui/")) {
            return "radix";
          }
          // DnD kit — only used by admin dashboard
          if (id.includes("node_modules/@dnd-kit/")) {
            return "dndkit";
          }
          // Recharts — heavy charting lib
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "recharts";
          }
          // Form handling
          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/@hookform/")) {
            return "forms";
          }
          // Stripe
          if (id.includes("node_modules/@stripe/")) {
            return "stripe";
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
