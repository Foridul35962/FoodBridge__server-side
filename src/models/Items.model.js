import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    image:{
        url:{
            type: String,
            required: true
        },
        publicId:{
            type: String,
            required: true
        }
    },
    shop:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shops',
        required: true
    },
    category:{
        type:String,
        required: true
    },
    price:{
        type: Number,
        required: true,
        default: 0
    },
    foodTypes:{
        type: String,
        required: true,
        enum: ['veg', 'non veg']
    },
}, {timestamps: true})

const Items = mongoose.model('Items', itemSchema)
export default Items