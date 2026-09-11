import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './app.js';

// Load backend/.env explicitly (independent of the shell's working directory).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5000;

startServer(PORT).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
