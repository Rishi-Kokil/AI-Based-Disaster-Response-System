import mongoose from 'mongoose';

const agencyNotificationSchema = new mongoose.Schema({
    agency_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
    report_type: { 
        type: String, 
        enum: ['user_report', 'social_media_report'], 
        required: true 
    },
    report_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    is_viewed: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
});

export const AgencyNotification =  mongoose.model('AgencyNotification', agencyNotificationSchema);