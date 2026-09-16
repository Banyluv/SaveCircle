import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Root-absolute asset URLs — correct for every environment that serves the app
  // over HTTP: the hosted build (Express serves dist/), the Vite dev server, and
  // the Capacitor APK (its local server roots the web dir at "/").
  //
  // It must NOT be './' here. A relative base is only right for the Electron
  // desktop shell, which loads dist/index.html over file://. Over HTTP a
  // relative base makes the browser resolve assets against the CURRENT path, so
  // any URL with a path — a deep link, a bookmark, /login — requests
  // /some/deep/assets/index-*.js, gets the SPA's HTML back, and renders a
  // completely blank page (the module never executes).
  //
  // The desktop build overrides this with `vite build --base=./` (see the
  // electron:build / electron:pack npm scripts).
  base: '/',
  server: {
    port: 3000,
    open: false,
    // Bind all interfaces so a phone on the same Wi-Fi can reach the dev server
    // (otherwise it listens on localhost only and the phone gets
    // "refused to connect"). Vite prints the LAN URL on startup.
    host: true,
    // Avoid watching build/packaging output (prevents file locks during electron-builder)
    watch: {
      ignored: ['**/release/**', '**/dist/**', '**/node_modules/**', '**/android/**'],
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
