import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Keep initial bundles lean for faster load; split heavy libs into separate chunks.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.match(/react|scheduler|use-sync-external-store/)) return "react-vendor";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("pdfjs-dist") || id.includes("jspdf") || id.includes("html2canvas")) return "pdf-tools";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("@dnd-kit")) return "dnd-kit";
            if (id.includes("framer-motion")) return "framer-motion";
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
}));
