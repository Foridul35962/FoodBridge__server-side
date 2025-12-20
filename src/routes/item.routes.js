import express from 'express'
import * as itemController from '../controller/item.controller.js'
import protect from '../middlewares/protected.js'
import upload from '../middlewares/upload.js'
import isOwner from '../middlewares/isOwner.js'

const itemRouter = express.Router()

itemRouter.post('/add-item', protect, isOwner, upload, itemController.addItem)
itemRouter.patch('/edit-item/:itemId', protect, isOwner, upload, itemController.editItem)
itemRouter.delete('/delete', protect, isOwner, itemController.deleteItem)
itemRouter.get('/get', itemController.allItem)
itemRouter.get('/get-item-by-id/:itemId', protect, itemController.getItemById)

export default itemRouter