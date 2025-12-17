import mongoose from 'mongoose'

const shopSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    image: {
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        }
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    }
}, { timestamps: true })

const Shops = mongoose.model('Shop', shopSchema)

export default Shops