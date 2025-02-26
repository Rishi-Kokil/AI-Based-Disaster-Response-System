import mongoose from 'mongoose';

const userDisasterReportSchema = new mongoose.Schema({
    user_session_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    report_type: { 
        type: String, 
        enum: ['audio', 'video', 'text'], 
        required: true 
    },
    description: { type: String },
    ai_analysis_result: { type: String },
    location_details: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

export const UserDisasterReport = mongoose.model('UserDisasterReport', userDisasterReportSchema);
