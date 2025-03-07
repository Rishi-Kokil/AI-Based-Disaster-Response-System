import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Load environment variables from .env file one level up

const connectionString = process.env.MONGODB_URI;

if (!connectionString) {
    throw new Error('MONGODB_URI is not defined in the environment variables');
}

const connection = mongoose.createConnection(connectionString).on('open', () => {
    console.log('Database connected');
}).on('error', (error) => {
    console.log('Error', error);
});

export default connection;