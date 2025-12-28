import { generateDeliveryAcceptMail, transporter } from "../config/mail.js";
import DeliveryAssainments from "../models/DeliveryAssainment.model.js";
import Orders from "../models/Order.model.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";

export const getCurrentOrder = AsyncHandler(async (req, res) => {
    const assignment = await DeliveryAssainments.findOne({
        assignedTo: req.user._id,
        status: 'assigned'
    })
        .populate('shop', 'name address state')
        .populate('assignedTo', 'fullName email mobile location')
        .populate({
            path: "order",
            populate: [{
                path: "user",
                select: "fullName email location mobile"
            }]
        })

    if (!assignment) {
        throw new ApiErrors(404, 'assignment not found')
    }

    if (!assignment.order) {
        throw new ApiErrors(404, 'order not found')
    }

    const shopOrder = assignment.order.shopOrders.find(so => so._id.toString() === assignment.shopOrderId.toString())

    if (!shopOrder) {
        throw new ApiErrors(404, 'shop order not found')
    }

    let deliveryBoyLocation = { lat: null, lon: null }
    deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1]
    deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0]

    let customerLocation = { lat: null, lon: null }
    customerLocation.lat = assignment.order.deliveryAddress.latitude
    customerLocation.lon = assignment.order.deliveryAddress.longitude

    const responseData = {
        _id: assignment.order._id,
        user: assignment.order.user,
        shopOrder,
        shop: assignment.shop,
        deliveryAddress: assignment.order.deliveryAddress,
        deliveryBoyLocation,
        customerLocation
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, responseData, 'delivery man current order fetched successfully')
        )
})

export const sendDeliveryOtp = AsyncHandler(async (req, res) => {
    const { orderId, shopOrderId } = req.body

    const order = await Orders.findById(orderId).populate("user")
    if (!order) {
        throw new ApiErrors(404, 'order not found')
    }

    const shopOrder = order.shopOrders.find(
        so => so._id.toString() === shopOrderId
    )

    if (!shopOrder) {
        throw new ApiErrors(404, 'shopOrder not found')
    }

    if (shopOrder.assignedDeliveryBoy.toString() !== req.user._id.toString()) {
        throw new ApiErrors(401, 'unauthorize access')
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiredOtp = new Date(Date.now() + 5 * 60 * 1000)

    shopOrder.otp = otp
    shopOrder.expiredOtp = expiredOtp

    await order.save()

    const mailOption = generateDeliveryAcceptMail(order.user.email, otp)
    await transporter.sendMail(mailOption)

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'mail sent successfully')
        )
})

export const verifyDelivery = AsyncHandler(async (req, res) => {
    const { orderId, shopOrderId, otp } = req.body

    const order = await Orders.findById(orderId).populate("user")
    if (!order) {
        throw new ApiErrors(404, 'order not found')
    }

    const shopOrder = order.shopOrders.find(
        so => so._id.toString() === shopOrderId
    )

    if (!shopOrder) {
        throw new ApiErrors(404, 'shopOrder not found')
    }

    if (shopOrder.assignedDeliveryBoy.toString() !== req.user._id.toString()) {
        throw new ApiErrors(401, 'unauthorize access')
    }

    if (shopOrder.otp !== otp) {
        throw new ApiErrors(400, 'otp does not matched')
    }

    if (shopOrder.expiredOtp < Date.now()) {
        throw new ApiErrors(400, 'otp is expired')
    }

    shopOrder.status = 'Delivered'
    await order.save()
    await DeliveryAssainments.deleteOne({
        _id: shopOrder.assignment
    })

    const io = req.app.get('io');
    if (io) {
        const payload = {
            orderId,
            shopOrderId,
            status: 'Delivered'
        };

        io.to(order.user._id.toString()).emit(
            'orderStatusUpdated',
            payload
        );

        io.to(shopOrder.owner.toString()).emit(
            'orderStatusUpdated',
            payload
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'otp verified successfully')
        )
})