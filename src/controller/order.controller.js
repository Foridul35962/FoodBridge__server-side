import Orders from "../models/Order.model.js";
import Shops from "../models/shop.model.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";

export const placeOrder = AsyncHandler(async(req, res)=>{
    const {cartItems, paymentMethod, deliveryAddress, totalAmount} = req.body
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

    const shopOrders = await Promise.all(Object.keys(groupItemShop).map(async (shopId)=>{
        const shop = await Shops.findById(shopId).populate({path:'owner', select: "-password"})
        if (!shop) {
            throw new ApiErrors(404, 'Shop is not found')
        }
        const items = groupItemShop[shopId]
        const subTotal = items.reduce((sum, current)=>sum + Number(current.price) * Number(current.quantity),0)
        return {
            shop: shopId,
            owner: shop.owner,
            subTotal,
            shopOrderItems: items.map((i)=>({
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