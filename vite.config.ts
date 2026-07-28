import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@tiptap") || id.includes("prosemirror") || id.includes("yjs") || id.includes("y-protocols") || id.includes("lib0")) return "vendor-editor";
            if (id.includes("docx") || id.includes("html2pdf") || id.includes("jspdf") || id.includes("html2canvas")) return "vendor-export";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("date-fns")) return "vendor-datefns";
            return "vendor";
          },
        },
      },
    },
  };
});
