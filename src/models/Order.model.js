import mongoose from 'mongoose'


const shopOrderItemSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Items'
    },
    price: Number,
    quantity: Number
}, { timestamps: true })



const shopOrderSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    subTotal: Number,
    shopOrderItems: [shopOrderItemSchema],
    status: {
        type: String,
        enum: ['Pending', 'Preparing', 'Out of delivery', 'Delivered'],
        default: 'Pending'
    },
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryAssainments",
        default: null
    },
    assignedDeliveryBoy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    otp:{
        type: String
    },
    expiredOtp:{
        type: Date
    }
}, { timestamps: true })



const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Online'],
        required: true
    },
    deliveryAddress: {
        text: String,
        latitude: Number,
        longitude: Number
    },
    totalAmount: {
        type: Number
    },
    shopOrders: [shopOrderSchema]
}, { timestamps: true })

const Orders = mongoose.model('Orders', orderSchema)
export default Orders