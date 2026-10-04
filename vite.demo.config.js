import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';

// One self-contained file of the app in demo mode, used for the hosted preview.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  define: { 'import.meta.env.VITE_FORCE_DEMO': JSON.stringify('1') },
  build: { outDir: 'dist-demo', rollupOptions: { input: resolve(__dirname, 'app.html') } }
});
