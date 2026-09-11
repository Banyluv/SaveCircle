import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './app.js';

// Load backend/.env explicitly (independent of the shell's working directory).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5000;

// Hosted platforms (Render, Railway, Fly, ...) route traffic to the container
// from outside, so the server must bind all interfaces. Locally we stay on
// 127.0.0.1 (what the desktop shell expects). HOST always wins if set.
const isHosted = process.env.RENDER
    || process.env.NODE_ENV === 'production'
    || process.env.HOSTED === 'true';
const HOST = process.env.HOST || (isHosted ? '0.0.0.0' : '127.0.0.1');

startServer(PORT, HOST).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
