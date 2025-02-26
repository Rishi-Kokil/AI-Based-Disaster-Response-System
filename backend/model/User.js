import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    session_id: { type: String, required: true, unique: true }, // Temporary authentication mechanism
    last_online: { type: Date },
    created_at: { type: Date, default: Date.now },
});


export const User = mongoose.model('User', userSchema);

