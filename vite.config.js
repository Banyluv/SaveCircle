import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built app can be loaded from file:// in the desktop shell
  base: './',
  server: {
    port: 3000,
    open: false,
    // Avoid watching build/packaging output (prevents file locks during electron-builder)
    watch: {
      ignored: ['**/release/**', '**/dist/**', '**/node_modules/**'],
    },
    // Proxy API requests to the backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
