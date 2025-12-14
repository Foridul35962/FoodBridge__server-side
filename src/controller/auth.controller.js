import { check, validationResult } from 'express-validator'
import AsyncHandler from '../utils/AsyncHandler.js'
import ApiErrors from '../utils/ApiErrors.js'
import Users from '../models/Users.model.js'
import bcrypt from 'bcryptjs'
import { generateVerificationMail, transporter } from '../config/mail.js'
import TempUsers from '../models/TempUsers.model.js'
import ApiResponse from '../utils/ApiResponse.js'

export const registration = [
    check('email')
        .trim()
        .isEmail()
        .withMessage('Entered a valid email'),
    check('password')
        .trim()
        .isLength({ min: 8 })
        .withMessage('password must be at least 8 characters')
        .matches(/[a-zA-Z]/)
        .withMessage('password must contain a letter')
        .matches(/[0-9]/)
        .withMessage('password must contain a number'),

    AsyncHandler(async (req, res) => {
        const {fullName, email, password, mobile, role} = req.body
        if (!fullName || !email || !password || !mobile || !role) {
            throw new ApiErrors(400, 'all fields are required')
        }

        const error = validationResult(req)
        if (!error.isEmpty()) {
            throw new ApiErrors(400, 'entered wrong value', error.array())
        }

        if (!role === 'user' && !role === 'owner' && !role === 'deliveryBoy') {
            throw new ApiErrors(400, 'entered wrong role')
        }

        const dublicatedUser = await Users.findOne({email})
        if (dublicatedUser) {
            throw new ApiErrors(400, 'this email is already registered')
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiredOtp = Date.now() + 5 * 60 * 1000

        const hashPass = await bcrypt.hash(password, 12)

        const mailOption = generateVerificationMail(email, otp)

        try {
            await TempUsers.findOneAndUpdate(
                { email },
                {fullName, password: hashPass, mobile, role, otp, expiredOtp },
                {new: true, upsert: true}
            )
            transporter.sendMail(mailOption)

            return res
                .status(201)
                .json(
                    new ApiResponse(200, {}, 'otp send successfully')
                )
        } catch (error) {
            throw new ApiErrors(500, 'otp send failed')
        }
    })
]