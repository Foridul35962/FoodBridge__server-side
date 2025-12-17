import express from 'express'
import * as shopController from '../controller/shop.controller.js'
import protect from '../middlewares/protected.js'
import upload from '../middlewares/upload.js'

const shopRouter = express.Router()

shopRouter.post('/add-shop', protect, upload, shopController.createShop)
shopRouter.patch('/edit-shop', protect, upload, shopController.editShop)

export default shopRouter