import mongoose from "mongoose";
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
            // 1. Filter orders that have this owner's shop
            { $match: { "shopOrders.owner": userId } },

            // 2. Break the shopOrders array into individual documents
            { $unwind: "$shopOrders" },

            // 3. Keep ONLY the shopOrder that belongs to this specific owner
            { $match: { "shopOrders.owner": userId } },

            // 4. Populate Shop details
            {
                $lookup: {
                    from: "shops", // collection name for shops
                    localField: "shopOrders.shop",
                    foreignField: "_id",
                    as: "shopOrders.shop"
                }
            },
            { $unwind: "$shopOrders.shop" },

            // 5. Populate ALL items in the shopOrderItems array at once
            {
                $lookup: {
                    from: "items", // Use your actual collection name (likely "items")
                    localField: "shopOrders.shopOrderItems.item",
                    foreignField: "_id",
                    as: "all_item_details"
                }
            },

            // 6. Merge the full item details into the shopOrderItems array
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
                                                        cond: { $eq: ["$$detail._id", "$$subItem.item"] }
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

            // 7. Populate User details
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },

            // 8. Final Sort and Cleanup
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    "user.password": 0,
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
});


export const changeOrderStatus = AsyncHandler(async (req, res) => {
    const { orderId, shopId, status } = req.body;

    if (!orderId || !shopId || !status) {
        throw new ApiErrors(400, "Order ID, Shop ID and Status are required");
    }

    const updateResult = await Orders.updateOne(
        { _id: orderId, "shopOrders.shop": shopId },
        { $set: { "shopOrders.$[elem].status": status } },
        { arrayFilters: [{ "elem.shop": shopId }] }
    );

    if (updateResult.matchedCount === 0) {
        throw new ApiErrors(404, "Order or Shop not found");
    }

    const order = await Orders.findById(orderId)
        .populate("user", "-password")
        .populate("shopOrders.shop")
        .populate("shopOrders.shopOrderItems.item")
        .populate("shopOrders.assignedDeliveryBoy", "fullName email mobile");

    if (!order) {
        throw new ApiErrors(404, "Order not found");
    }

    const shopOrder = order.shopOrders.find(
        so => so.shop && so.shop._id.toString() === shopId
    );

    if (!shopOrder) {
        throw new ApiErrors(404, "Shop order not found");
    }

    let deliveryBoyPayload = null;

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

        const assignment = await DeliveryAssainments.create({
            order: order._id,
            shop: shopOrder.shop._id,
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
            longitude: b.location.coordinates[0],
            latitude: b.location.coordinates[1],
            mobile: b.mobile
        }));
    }

    const responsePayload = {
        _id: order._id,
        user: order.user,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
        totalAmount: order.totalAmount,
        shopOrders: shopOrder,
        deliveryCandidates: deliveryBoyPayload
    };

    return res.status(200).json(
        new ApiResponse(
            200,
            responsePayload,
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