import mongoose from "mongoose";


const responseAgentSchema = new mongoose.Schema({
    agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true }, // Foreign Key to Agency
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone_number: { type: String, required: true },
    password_hash: { type: String, required: true }, // Hashed password for security
    last_online: { type: Date },
    account_created_on: { type: Date, default: Date.now },
    location_details: { type: String }, // JSON containing location data when on duty
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // Foreign Key to Team (nullable)
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

export const ResponseAgent = mongoose.model('ResponseAgent', responseAgentSchema);