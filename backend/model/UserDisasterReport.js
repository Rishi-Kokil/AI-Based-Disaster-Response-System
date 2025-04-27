import mongoose from 'mongoose';

const disasterReportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['image', 'audio'],
        required: true
    },
    fileData: {
        type: String, 
        required: true
    },
    location: {
        latitude: Number,
        longitude: Number
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String
    },
    severity: {
        type: String,
        required: function () { return this.type === 'image'; }
    },
    transcript: {
        type: String,
        required: function () { return this.type === 'audio'; }
    }
});

export const UserDisasterReport = mongoose.model('UserDisasterReport', disasterReportSchema);

