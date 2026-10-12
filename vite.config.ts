import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Base path: '/' for Vercel (primary). Override with VITE_BASE_PATH=/ai-music-remover/
// if deploying to GitHub Pages project URL.
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy AI libs are lazy-loaded via dynamic import(); keep them out
          // of the initial bundle. Workers import them at runtime.
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
