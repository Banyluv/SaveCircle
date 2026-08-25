import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../backend/app.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Offline desktop configuration ---
// Force file-based storage (no external PostgreSQL needed) and bind the
// backend to localhost only, so the app works with zero network access.
process.env.STORAGE_MODE = 'file';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'savecircle_desktop_secret_key_2026';

// Data directory lives inside Electron's userData folder (per-user, writable).
process.env.SAVECIRCLE_DATA_DIR = path.join(app.getPath('userData'), 'data');

// Load backend .env if present (dotenv will not override already-set vars)
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

let mainWindow = null;
let apiServer = null;
const API_PORT = 5055; // internal port used by the desktop app

const isDev = !app.isPackaged;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        autoHideMenuBar: true,
        title: 'SaveCircle',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // External links open in the system browser, not inside the app
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // In production (packaged) we always load the built files from disk.
    // In dev, load the Vite dev server — unless SAVECIRCLE_FORCE_DIST is set, which
    // lets us test the production build without packaging.
    if (isDev && !process.env.SAVECIRCLE_FORCE_DIST) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

const startApiServer = async () => {
    if (apiServer) return apiServer;
    apiServer = await startServer(API_PORT);
    return apiServer;
};

// IPC: tell the renderer which API base URL to use.
ipcMain.handle('get-api-base-url', () => `http://localhost:${API_PORT}`);
ipcMain.handle('get-app-version', () => app.getVersion());

app.whenReady().then(async () => {
    // Start the embedded API server first, then show the window.
    try {
        await startApiServer();
    } catch (error) {
        console.error('Failed to start embedded API:', error);
    }
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Graceful shutdown: close the API server when the app quits.
app.on('before-quit', async () => {
    if (apiServer) {
        try {
            apiServer.close();
        } catch (e) {
            // ignore
        }
        apiServer = null;
    }
});
