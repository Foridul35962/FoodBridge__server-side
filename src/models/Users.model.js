import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
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
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true,
            default: [0, 0]
        }
    },
    socketId: {
        type: String
    },
    isOnline:{
        type: Boolean
    }
}, { timestamps: true })

userSchema.index({ location: "2dsphere" })

const Users = mongoose.model('Users', userSchema)

export default Users