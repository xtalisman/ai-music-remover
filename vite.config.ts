import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Base path: '/ai-music-remover/' for the free github.io URL.
// Override with VITE_BASE_PATH=/ when a custom domain is connected.
const base = process.env.VITE_BASE_PATH ?? '/ai-music-remover/';

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
