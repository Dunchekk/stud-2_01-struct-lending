import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages / subpath-friendly build (prevents "/assets/..." absolute URLs)
  base: "./",
  root: ".", // корень проекта (по умолчанию)
  publicDir: "public", // статические файлы, копируются как есть
  build: {
    outDir: "docs", // папка сборки
    emptyOutDir: true, // очистка перед билдом
  },
  server: {
    port: 5173,
    open: false,
  },
});
