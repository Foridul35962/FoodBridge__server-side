import express from 'express'
import * as orderController from '../controller/order.controller.js'
import protect from '../middlewares/protected.js'

const orderRouter = express.Router()

orderRouter.post('/place-order', protect, orderController.placeOrder)
orderRouter.get('/my-orders', protect, orderController.getMyOrders)
orderRouter.post('/change-status', protect, orderController.changeOrderStatus)
orderRouter.get('/get-assignments', protect, orderController.getDeliveryAssignment)

export default orderRouter