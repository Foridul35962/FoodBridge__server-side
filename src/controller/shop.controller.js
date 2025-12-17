import cloudinary from "../config/cloudinary.js";
import Items from "../models/Items.model.js";
import Shops from "../models/shop.model.js";
import ApiErrors from "../utils/ApiErrors.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsyncHandler from "../utils/AsyncHandler.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

export const createShop = AsyncHandler(async (req, res) => {
    const { name, city, state, address } = req.body
    if (!name || !city || !state || !address) {
        throw new ApiErrors(400, 'all field are required')
    }

    const dublicateShop = await Shops.findOne({ name })
    if (dublicateShop) {
        throw new ApiErrors(400, 'shop is already exist')
    }

    const user = req.user
    if (!user) {
        throw new ApiErrors(401, 'unauthorize access')
    }

    try {
        const image = req.files?.[0]
        if (!image) {
            throw new ApiErrors(400, 'image is required')
        }
        const uploaded = await uploadToCloudinary(image.buffer, 'FoodBridge')

        const uploadedImage = {
            url: uploaded.secure_url,
            publicId: uploaded.public_id
        }

        const shop = await Shops.create({
            owner: user._id,
            name,
            city,
            state,
            address,
            image: uploadedImage
        })

        return res
            .status(200)
            .json(
                new ApiResponse(200, shop, 'shop created successfully')
            )
    } catch (error) {
        throw new ApiErrors(500, 'shop created failed')
    }
})

export const editShop = AsyncHandler(async (req, res) => {
    const { name, city, state, address } = req.body
    const user = req.user

    const {shopId} = req.params

    if (!shopId) {
        throw new ApiErrors(400, 'shop Id is required')
    }

    const dublicateShop = await Shops.findOne({
        name,
        _id: { $ne: shopId }
    })

    if (dublicateShop) {
        throw new ApiErrors(400, 'this shop name is already exest')
    }

    const shop = await Shops.findById(shopId)
    if (!shop) {
        throw new ApiErrors(404, 'shop is not found')
    }

    if (!shop.owner.equals(user._id)) {
        throw new ApiErrors(401, 'unauthorize access')
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
            await cloudinary.uploader.destroy(shop.image.publicId)
        } catch (error) {
            throw new ApiErrors(500, 'image upload failed')
        }
    }
    shop.name = name ?? shop.name
    shop.city = city ?? shop.city
    shop.state = state ?? shop.state
    shop.address = address ?? shop.address
    if (uploadedImage) {
        shop.image = uploadedImage
    }
    await shop.save()

    return res
        .status(200)
        .json(
            new ApiResponse(200, shop, 'shop updated successfully')
        )
})

export const fetchMyItems = AsyncHandler(async(req, res)=>{
    const userId = req.user._id
    const shop = await Shops.findOne({owner:userId})
    if (!shop) {
        throw new ApiErrors(404, 'shop not found')
    }

    const items = Items.find({shop: shop._id})
    if (!items) {
        throw new ApiErrors(404, 'item is not found')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, items, 'items fetched successfully')
        )
})