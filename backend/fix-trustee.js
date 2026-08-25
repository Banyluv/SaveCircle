import { connectDB } from './config/db.js';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
    await connectDB();
    await User.deleteOne({ email: 'trustee@savecircle.com' });
    console.log('Deleted old trustee. Nodemon will recreate it cleanly!');
    process.exit(0);
}
fix();
