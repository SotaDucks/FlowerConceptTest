import { defineConfig } from 'vite';

// Relative asset paths so the build works under a GitHub Pages project path.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
});
