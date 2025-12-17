import express from 'express'
import * as shopController from '../controller/shop.controller.js'
import protect from '../middlewares/protected.js'
import upload from '../middlewares/upload.js'
import isOwner from '../middlewares/isOwner.js'

const shopRouter = express.Router()

shopRouter.post('/add-shop', protect, isOwner, upload, shopController.createShop)
shopRouter.patch('/edit-shop/:shopId', isOwner, protect, upload, shopController.editShop)

export default shopRouter