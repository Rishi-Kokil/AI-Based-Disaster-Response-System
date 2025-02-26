import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    agent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ResponseAgent', required: true },
    location_details: { type: String, required: true },
    description: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'in_progress', 'completed'], 
        default: 'pending' 
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

export const Assignment = mongoose.model('Assignment', assignmentSchema);