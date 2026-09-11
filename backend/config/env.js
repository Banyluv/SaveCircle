// Loads backend/.env into process.env as early as possible.
//
// This module must be imported BEFORE anything that reads process.env at module
// scope (e.g. config/db.js builds its connection pool on import). ESM evaluates
// imports in the order they are listed, so `import './config/env.js'` must be the
// first import in app.js.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// backend/config/env.js -> backend/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default process.env;
