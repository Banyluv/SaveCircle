import dotenv from 'dotenv';
import { startServer } from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

startServer(PORT).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
