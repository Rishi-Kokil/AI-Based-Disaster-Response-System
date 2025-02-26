import mongoose from 'mongoose';

const socialMediaReportSchema = new mongoose.Schema({
    platform: { type: String, required: true },
    post_id: { type: String, required: true },
    post_url: { type: String, required: true },
    post_content: { type: String, required: true },
    ai_analysis_result: { type: String },
    location_details: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

export const SocialMediaReport = mongoose.model('SocialMediaReport', socialMediaReportSchema);