import express from 'express'
import * as deliveryController from '../controller/delivery.controller.js'
import protect from '../middlewares/protected.js'

const deliveryRouter = express.Router()

deliveryRouter.get('/get-current-order', protect, deliveryController.getCurrentOrder)

export default deliveryRouter