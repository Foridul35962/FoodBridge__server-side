import Orders from "../models/Order.model.js";
import Shops from "../models/shop.model.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";

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