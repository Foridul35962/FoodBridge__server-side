import mongoose from "mongoose";

const tempUserSchema = new mongoose.Schema({
    fullName: {
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
    mobile: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'owner', 'deliveryBoy']
    },
    otp: {
        type: String,
        required: true
    },
    expiredOtp: {
        type: Date,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600
    }
}, { timestamps: true })

const TempUsers = mongoose.model('TempUsers', tempUserSchema)

export default TempUsers