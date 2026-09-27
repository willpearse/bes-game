import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000
  },
  server: { port: 8080 }
});
