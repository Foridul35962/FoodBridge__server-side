import cloudinary from "../config/cloudinary.js";
import Items from "../models/Items.model.js";
import Shops from "../models/shop.model.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

export const addItem = AsyncHandler(async (req, res) => {
    const { name, category, price, foodTypes } = req.body
    
    if (!name || !category || !price || !foodTypes) {
        throw new ApiErrors(400, 'all field are required')
    }

    const user = req.user

    const shop = await Shops.findOne({ owner: user._id })
    if (!shop) {
        throw new ApiErrors(404, 'shop not found')
    }

    const image = req.files?.[0]
    if (!image) {
        throw new ApiErrors(400, 'image is required')
    }

    try {
        const uploaded = await uploadToCloudinary(image.buffer, 'FoodBridge')
        const uploadedImage = {
            url: uploaded.secure_url,
            publicId: uploaded.public_id
        }

        const item = await Items.create({
            name,
            image: uploadedImage,
            shop: shop._id,
            category,
            price,
            foodTypes
        })

        return res
            .status(200)
            .json(
                new ApiResponse(200, item, 'item add successfully')
            )
    } catch (error) {
        throw new ApiErrors(500, 'item added failed')
    }
})


export const editItem = AsyncHandler(async (req, res) => {
    const { name, category, price, foodTypes } = req.body
    const {itemId} = req.params
    if (!itemId) {
        throw new ApiErrors(400, 'item id is required')
    }

    const userId = req.user._id

    const item = await Items.findById(itemId).populate({
        path: 'shop',
        match: { owner: userId }
    })

    if (!item || !item.shop) {
        throw new ApiErrors(401, 'unauthorized or item not found')
    }

    const image = req.files?.[0]
    let uploadedImage
    if (image) {
        try {
            const uploaded = await uploadToCloudinary(image.buffer, 'FoodBridge')

            uploadedImage = {
                url: uploaded.secure_url,
                publicId: uploaded.public_id
            }
            await cloudinary.uploader.destroy(item.image.publicId)
        } catch (error) {
            throw new ApiErrors(500, 'image upload failed')
        }
    }
    if (uploadedImage) {
        item.image = uploadedImage
    }
    item.name = name ?? item.name
    item.category = category ?? item.category
    item.price = price ?? item.price
    item.foodTypes = foodTypes ?? item.foodTypes

    await item.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, item, 'item updated successfully')
        )
})

export const deleteItem = AsyncHandler(async (req, res) => {
    const { itemId } = req.body
    if (!itemId) {
        throw new ApiErrors(400, 'itemId is required')
    }
    
    const userId = req.user?._id
    // item + shop + owner verify in ONE step
    const item = await Items.findOne({ _id: itemId }).populate({
        path: 'shop',
        match: { owner: userId }
    })
    
    if (!item || !item.shop) {
        throw new ApiErrors(401, 'unauthorized or item not found')
    }

    try {
        await cloudinary.uploader.destroy(item.image.publicId)
        await item.deleteOne()

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, 'item deleted successfully')
            )
    } catch (error) {
        throw new ApiErrors(500, 'item deleted failed')
    }
})