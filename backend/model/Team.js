import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
    agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true }, // Foreign Key to Agency
    name: { type: String, required: true },
    description: { type: String }, // Optional description of the team
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});


export const Team = mongoose.model('Team', teamSchema);