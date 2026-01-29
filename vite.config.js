import { defineConfig } from "vite";

export default defineConfig({
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
