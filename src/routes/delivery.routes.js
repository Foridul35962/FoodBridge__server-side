import express from 'express'
import * as deliveryController from '../controller/delivery.controller.js'
import protect from '../middlewares/protected.js'

const deliveryRouter = express.Router()

deliveryRouter.get('/get-current-order', protect, deliveryController.getCurrentOrder)
deliveryRouter.post('/send-otp', protect, deliveryController.sendDeliveryOtp)
deliveryRouter.post('/verify-otp', protect, deliveryController.verifyDelivery)
deliveryRouter.get('/todays-deliveries', protect, deliveryController.getTodayDeliveries)

export default deliveryRouter