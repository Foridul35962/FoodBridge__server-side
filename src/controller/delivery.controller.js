import DeliveryAssainments from "../models/DeliveryAssainment.model.js";
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