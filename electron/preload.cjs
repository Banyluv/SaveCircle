// Preload script — exposes a minimal, safe API to the renderer.
// The API port here MUST match the embedded backend port in main.mjs.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('savecircleDesktop', {
    isDesktop: true,
    apiBaseUrl: 'http://localhost:5055',
    version: '1.0.0'
});
