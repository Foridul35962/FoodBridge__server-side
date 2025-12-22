import express from 'express'
import * as authController from '../controller/auth.controller.js'
import protect from '../middlewares/protected.js'

const authRouter = express.Router()

authRouter.post('/register', authController.registration)
authRouter.post('/verify-regi', authController.verifyRegi)
authRouter.post('/login', authController.login)
authRouter.get('/logout', authController.logout)
authRouter.post('/forget-pass', authController.forgetPassword)
authRouter.post('/verify-pass', authController.verifyPass)
authRouter.patch('/reset-pass', authController.resetPass)
authRouter.get('/get-user', protect, authController.getUsers)
authRouter.post('/update-location', protect, authController.updateUserLocation)

export default authRouter