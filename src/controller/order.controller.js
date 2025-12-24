import Orders from "../models/Order.model.js";
import Shops from "../models/shop.model.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";
import Users from "../models/Users.model.js";
import DeliveryAssainments from "../models/DeliveryAssainment.model.js";

export const placeOrder = AsyncHandler(async (req, res) => {
    const { cartItems, paymentMethod, deliveryAddress, totalAmount } = req.body
    if (!cartItems || !paymentMethod || !deliveryAddress || !totalAmount) {
        throw new ApiErrors(400, 'all field are required')
    }

    const groupItemShop = []
    cartItems.forEach(item => {
        const shopId = item.shop
        if (!groupItemShop[shopId]) {
            groupItemShop[shopId] = []
        }
        groupItemShop[shopId].push(item)
    });

    const shopOrders = await Promise.all(Object.keys(groupItemShop).map(async (shopId) => {
        const shop = await Shops.findById(shopId).populate({ path: 'owner', select: "-password" })
        if (!shop) {
            throw new ApiErrors(404, 'Shop is not found')
        }
        const items = groupItemShop[shopId]
        const subTotal = items.reduce((sum, current) => sum + Number(current.price) * Number(current.quantity), 0)
        return {
            shop: shopId,
            owner: shop.owner,
            subTotal,
            shopOrderItems: items.map((i) => ({
                item: i._id,
                price: i.price,
                quantity: i.quantity,
                name: i.name
            }))
        }
    }))

    const newOrder = await Orders.create({
        user: req.user._id,
        paymentMethod,
        deliveryAddress,
        totalAmount,
        shopOrders
    })

    return res
        .status(200)
        .json(
            new ApiResponse(200, newOrder, 'order created successfully')
        )
})

export const getMyOrders = AsyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const user = req.user

        let orders
        if (user.role === 'user') {
            orders = await Orders.find({ user: userId })
                .sort({ createdAt: -1 })
                .populate({
                    path: "shopOrders",
                    populate: [
                        { path: "shop", select: "name" },
                        { path: "owner", select: "name email mobile" },
                        {
                            path: "shopOrderItems.item",
                            select: "name image price"
                        }
                    ]
                })
                .lean()
                .exec()
        } else if (user.role === 'owner') {
            orders = await Orders.aggregate([
                // Only orders where this owner exists
                { $match: { "shopOrders.owner": userId } },

                // Break shopOrders array
                { $unwind: "$shopOrders" },

                // Again match owner (important after unwind)
                { $match: { "shopOrders.owner": userId } },

                {
                    $lookup: {
                        from: "items",
                        localField: "shopOrders.shopOrderItems.item",
                        foreignField: "_id",
                        as: "all_item_details"
                    }
                },
                {
                    $addFields: {
                        "shopOrders.shopOrderItems": {
                            $map: {
                                input: "$shopOrders.shopOrderItems",
                                as: "subItem",
                                in: {
                                    $mergeObjects: [
                                        "$$subItem",
                                        {
                                            item: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$all_item_details",
                                                            as: "detail",
                                                            cond: {
                                                                $eq: ["$$detail._id", "$$subItem.item"]
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },

                {
                    $lookup: {
                        from: "users",
                        localField: "shopOrders.assignedDeliveryBoy",
                        foreignField: "_id",
                        as: "assignedDeliveryBoyObj"
                    }
                },
                {
                    $addFields: {
                        "shopOrders.assignedDeliveryBoy": {
                            $arrayElemAt: ["$assignedDeliveryBoyObj", 0]
                        }
                    }
                },

                {
                    $lookup: {
                        from: "deliveryassainments",
                        localField: "shopOrders.assignment",
                        foreignField: "_id",
                        as: "assignmentObj"
                    }
                },
                {
                    $addFields: {
                        "shopOrders.assignment": {
                            $arrayElemAt: ["$assignmentObj", 0]
                        }
                    }
                },

                {
                    $lookup: {
                        from: "users",
                        localField: "shopOrders.assignment.brodcastedTo",
                        foreignField: "_id",
                        as: "brodcastedToUsers"
                    }
                },
                {
                    $addFields: {
                        "shopOrders.assignment.brodcastedTo": {
                            $map: {
                                input: "$brodcastedToUsers",
                                as: "user",
                                in: {
                                    _id: "$$user._id",
                                    fullName: "$$user.fullName",
                                    email: "$$user.email",
                                    mobile: "$$user.mobile"
                                }
                            }
                        }
                    }
                },

                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                { $unwind: "$user" },
                { $sort: { createdAt: -1 } },
                {
                    $project: {
                        "user.password": 0,
                        "assignedDeliveryBoyObj": 0,
                        "assignmentObj": 0,
                        "brodcastedToUsers": 0,
                        "shopOrders.assignedDeliveryBoy.password": 0,
                        "all_item_details": 0,
                        "__v": 0
                    }
                }
            ]);

        }

        if (!orders || orders.length === 0) {
            throw new ApiErrors(404, 'No orders found for this user');
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, orders, 'Orders fetched successfully')
            );
    } catch (error) {
        console.log(error)
    }
});


export const changeOrderStatus = AsyncHandler(async (req, res) => {
    const { orderId, shopId, status } = req.body;

    if (!orderId || !shopId || !status) {
        throw new ApiErrors(400, "Order ID, Shop ID and Status are required");
    }

    // normalize shopId (frontend theke object ashle)
    let normalizedShopId = shopId;
    if (typeof shopId === "object" && shopId._id) {
        normalizedShopId = shopId._id;
    }

    // Get raw order (NO populate)
    const order = await Orders.findById(orderId);
    if (!order) {
        throw new ApiErrors(404, "Order not found");
    }

    // Find correct shopOrder
    const shopOrder = order.shopOrders.find(
        so => so.shop.toString() === normalizedShopId.toString()
    );

    if (!shopOrder) {
        console.log("ShopOrders:", order.shopOrders);
        console.log("Requested shopId:", normalizedShopId);
        throw new ApiErrors(404, "Shop order not found");
    }

    // Update status
    shopOrder.status = status;
    await order.save();

    let deliveryBoyPayload = null;

    //  Handle "Out of delivery"
    if (status === "Out of delivery" && !shopOrder.assignment) {
        const { latitude, longitude } = order.deliveryAddress;

        const nearbyDeliveryBoys = await Users.find({
            role: "deliveryBoy",
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [
                            Number(longitude),
                            Number(latitude)
                        ]
                    },
                    $maxDistance: 5000
                }
            }
        });

        if (nearbyDeliveryBoys.length === 0) {
            throw new ApiErrors(404, "No delivery boy nearby");
        }

        const nearbyIds = nearbyDeliveryBoys.map(b => b._id);

        const busyIds = await DeliveryAssainments.find({
            assignedTo: { $in: nearbyIds },
            status: { $nin: ["completed"] }
        }).distinct("assignedTo");

        const busySet = new Set(busyIds.map(id => id.toString()));

        const availableBoys = nearbyDeliveryBoys.filter(
            b => !busySet.has(b._id.toString())
        );

        if (availableBoys.length === 0) {
            throw new ApiErrors(404, "Delivery boy not available");
        }

        // Create assignment
        const assignment = await DeliveryAssainments.create({
            order: order._id,
            shop: shopOrder.shop,
            shopOrderId: shopOrder._id,
            brodcastedTo: availableBoys.map(b => b._id),
            status: "brodcasted"
        });

        shopOrder.assignment = assignment._id;
        shopOrder.assignedDeliveryBoy = null;
        await order.save();

        deliveryBoyPayload = availableBoys.map(b => ({
            _id: b._id,
            fullName: b.fullName,
            latitude: b.location.coordinates[1],
            longitude: b.location.coordinates[0],
            mobile: b.mobile
        }));
    }

    // Populate final response
    const populatedOrder = await Orders.findById(orderId)
        .populate("user", "-password")
        .populate("shopOrders.shop")
        .populate("shopOrders.shopOrderItems.item")
        .populate("shopOrders.assignedDeliveryBoy", "fullName email mobile")
        .populate({
            path: "shopOrders.assignment",
            populate: {
                path: "brodcastedTo",
                select: "fullName email mobile"
            }
        })

    const populatedShopOrder = populatedOrder.shopOrders.find(
        so => so._id.toString() === shopOrder._id.toString()
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                _id: populatedOrder._id,
                user: populatedOrder.user,
                paymentMethod: populatedOrder.paymentMethod,
                deliveryAddress: populatedOrder.deliveryAddress,
                totalAmount: populatedOrder.totalAmount,
                shopOrders: populatedShopOrder,
                createdAt: populatedOrder.createdAt,
                deliveryCandidates: deliveryBoyPayload
            },
            "Order status updated successfully"
        )
    );
});



export const getDeliveryAssignment = AsyncHandler(async (req, res) => {
    const deliveryBoyId = req.user._id
    const assignments = await DeliveryAssainments.find({
        brodcastedTo: deliveryBoyId,
        status: "brodcasted"
    })
        .populate({
            path: "order",
            populate: {
                path: "shopOrders.shopOrderItems.item"
            }
        })
        .populate("shop")

    if (assignments.length === 0) {
        throw new ApiErrors(404, 'no order found')
    }

    const formeted = assignments.map(a => ({
        assignmentId: a._id,
        orderId: a.order._id,
        shopName: a.shop.name,
        deliveryAddress: a.order.deliveryAddress,
        items: a.order.shopOrders.find(so => so._id.toString() === a.shopOrderId.toString())?.shopOrderItems || [],
        subTotal: a.order.shopOrders.find(so => so._id.toString() === a.shopOrderId.toString())?.subTotal
    }))

    return res
        .status(200)
        .json(
            new ApiResponse(200, formeted, 'delivery info fetched successfully')
        )
})

export const acceptOrder = AsyncHandler(async (req, res) => {
    const { assignmentId } = req.params
    const assignment = await DeliveryAssainments.findById(assignmentId)
    if (!assignment) {
        throw new ApiErrors(400, 'assignment not found')
    }
    if (assignment.status !== 'brodcasted') {
        throw new ApiErrors(400, 'assignment is expired')
    }

    const alreadyAssigned = await DeliveryAssainments.findOne({
        assignedTo: req.user._id,
        status: { $nin: ["brodcasted", 'completed'] }
    })

    if (alreadyAssigned) {
        throw new ApiErrors(400, 'delevery man is already assigned to another order')
    }

    assignment.assignedTo = req.user._id
    assignment.status = 'assigned'
    assignment.acceptedAt = Date.now()
    await assignment.save()

    const order = await Orders.findById(assignment.order)
    if (!order) {
        throw new ApiErrors(400, 'order not found')
    }

    const shopOrder = order.shopOrders.find(so => so._id.toString() === assignment.shopOrderId.toString())
    shopOrder.assignedDeliveryBoy = req.user._id
    await order.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'order accepted')
        )
})