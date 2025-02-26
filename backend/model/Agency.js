import mongoose from "mongoose";

const agencySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone_number: { type: String, required: true },
    password_hash: { type: String, required: true }, // Hashed password for security
    area_coordinates: { type: String, required: true }, // JSON or stringified coordinates
    profile_details: { type: String, required: true }, // JSON containing details about agents
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

export const Agency = mongoose.model('Agency', agencySchema);