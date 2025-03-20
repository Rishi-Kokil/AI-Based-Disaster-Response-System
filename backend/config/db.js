import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

dotenv.config({path: path.resolve(dirName, "../.env")});

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    
  } catch (err) {
    console.log(err);
  }
};


