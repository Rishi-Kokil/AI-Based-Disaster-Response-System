import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

dotenv.config({path: path.resolve(dirName, "../.env")});

let bucket;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL);

    // Initialize GridFSBucket
    bucket = new GridFSBucket(conn.connection.db, {
      bucketName: "uploads", // You can name the bucket as needed
    });
    console.log("GridFSBucket initialized");

  } catch (err) {-
    process.exit(1);
  }
};

// Export the GridFSBucket for use in other parts of your application
export { bucket };
