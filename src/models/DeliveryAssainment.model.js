import mongoose from "mongoose";

const deliveryAssainmentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Orders"
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    shopOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    brodcastedTo: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        }
    ],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        default: null
    },
    status: {
        type: String,
        enum: ["brodcasted", "assigned", "completed"],
        default: "brodcasted"
    },
    acceptedAt: Date
}, { timestamps: true })

const DeliveryAssainments = mongoose.model('DeliveryAssainments', deliveryAssainmentSchema)

export default DeliveryAssainments
