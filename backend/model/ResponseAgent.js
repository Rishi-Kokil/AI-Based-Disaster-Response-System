import mongoose from "mongoose";

const responseAgentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true }, // Hashed password for security
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const responseAgentProfileSchema = new mongoose.Schema({
    agent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ResponseAgent', required: true }, // Foreign Key to ResponseAgent
    agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true }, // Foreign Key to Agency
    name: { type: String, required: true },
    phone_number: { type: String, required: true },
    last_online: { type: Date },
    account_created_on: { type: Date, default: Date.now },
    location_details: { type: String }, // JSON containing location data when on duty
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // Foreign Key to Team (nullable)
    profile_image: { type: Buffer }, // Field to store uploaded image as binary data
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const ResponseAgentProfile = mongoose.model('ResponseAgentProfile', responseAgentProfileSchema);

const ResponseAgent = mongoose.model('ResponseAgent', responseAgentSchema);

export { ResponseAgent, ResponseAgentProfile };
