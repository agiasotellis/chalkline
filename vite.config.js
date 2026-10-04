import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Landing page at /, the live app at /app.html, the demo (example data in the browser) at /demo.html. Relative base so it works on GitHub Pages sub-paths.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), app: resolve(__dirname, 'app.html'), demo: resolve(__dirname, 'demo.html'), legal: resolve(__dirname, 'legal.html') }
    }
  }
});
