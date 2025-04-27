import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    disasterReports: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserDisasterReport'
    }]
});


userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        console.log('Error hashing password:', error);
        next(error);
    }
});


userSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        console.log('Error comparing password:', error);
        return false;
    }
};

export const User = mongoose.model('User', userSchema);
