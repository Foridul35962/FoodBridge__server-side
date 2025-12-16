import { check, validationResult } from 'express-validator'
import AsyncHandler from '../utils/AsyncHandler.js'
import ApiErrors from '../utils/ApiErrors.js'
import Users from '../models/Users.model.js'
import bcrypt, { truncates } from 'bcryptjs'
import { generatePasswordResetMail, generateVerificationMail, transporter } from '../config/mail.js'
import TempUsers from '../models/TempUsers.model.js'
import ApiResponse from '../utils/ApiResponse.js'
import { generateToken } from '../utils/token.js'

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
        const { fullName, email, password, mobile, role } = req.body
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

        const dublicatedUser = await Users.findOne({ email })
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
                { fullName, password: hashPass, mobile, role, otp, expiredOtp },
                { new: true, upsert: true }
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

export const verifyRegi = AsyncHandler(async (req, res) => {
    const { email, otp } = req.body
    if (!email) {
        throw new ApiErrors(400, 'email are required')
    }

    const tempUser = await TempUsers.findOne({ email })
    if (!tempUser) {
        throw new ApiErrors(404, 'user is not found')
    }

    if (otp === '' || otp !== tempUser.otp) {
        throw new ApiErrors(400, 'otp is not matched')
    }

    if (tempUser.expiredOtp.getTime() < Date.now()) {
        throw new ApiErrors(400, 'otp is expired')
    }

    let user = await Users.create({
        fullName: tempUser.fullName,
        email: tempUser.email,
        password: tempUser.password,
        mobile: tempUser.mobile,
        role: tempUser.role
    })

    user.password = undefined

    await TempUsers.findByIdAndDelete(tempUser._id)

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, 'user verified successfully')
        )
})

export const login = AsyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        throw new ApiErrors(400, 'all field are required')
    }

    const user = await Users.findOne({ email })
    if (!user) {
        throw new ApiErrors(404, 'user not found')
    }

    const isPassMatched = await bcrypt.compare(password, user.password)
    if (!isPassMatched) {
        throw new ApiErrors(400, 'password does not matched')
    }

    user.password = undefined
    const token = generateToken(user._id)
    const tokenOption = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 24 * 60 * 60 * 1000,
    }

    return res
        .status(200)
        .cookie(
            'token', token, tokenOption
        )
        .json(
            new ApiResponse(200, user, 'user loggedIn successfully')
        )
})

export const logout = AsyncHandler(async (req, res) => {
    try {
        const tokenOption = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        }

        return res
            .status(200)
            .clearCookie('token', tokenOption)
            .json(
                new ApiResponse(200, {}, 'logged out successfully')
            )
    } catch (error) {
        throw new ApiErrors(500, 'user logged out failed')
    }
})

export const forgetPassword = AsyncHandler(async (req, res) => {
    const { email } = req.body
    if (!email) {
        throw new ApiErrors(400, 'email is required')
    }

    const user = await Users.findOne({ email })
    if (!user) {
        throw new ApiErrors(404, 'user not found')
    }

    const otp = Math.floor(100000 * Math.random() + 900000).toString()
    const expiredOtp = Date.now() + 5 * 60 * 1000

    const mailOption = generatePasswordResetMail(email, otp)

    try {
        await TempUsers.findOneAndUpdate(
            { email },
            { otp, expiredOtp },
            { new: true, upsert: true }
        )

        await transporter.sendMail(mailOption)

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, 'otp send successfully')
            )
    } catch (error) {
        throw new ApiErrors(500, 'otp send failed')
    }
})

export const verifyPass = AsyncHandler(async (req, res) => {
    const { email, otp } = req.body
    if (!email || !otp) {
        throw new ApiErrors(400, 'all field are required')
    }

    const user = await TempUsers.findOne({ email })
    if (!user) {
        throw new ApiErrors(404, 'user is not found at tempuser')
    }

    if (otp !== user.otp) {
        throw new ApiErrors(400, 'otp is not matched')
    }

    if (user.expiredOtp < Date.now()) {
        throw new ApiErrors(400, 'otp is expired')
    }

    user.isVerified = true
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, 'user is verified successfully')
        )
})

export const resetPass = [
    check('password')
        .trim()
        .isLength({ min: 8 })
        .withMessage('password must be at least 8 characters')
        .matches(/[a-zA-Z]/)
        .withMessage('password must contain a letter')
        .matches(/[0-9]/)
        .withMessage('password must contain a number'),

    AsyncHandler(async (req, res) => {
        const { email, password } = req.body
        if (!email || !password) {
            throw new ApiErrors(400, 'all field are required')
        }

        const error = validationResult(req)
        if (!error.isEmpty()) {
            throw new ApiErrors(400, 'entered wrong value', error.array())
        }

        const tempUser = await TempUsers.findOne({ email })
        if (!tempUser) {
            throw new ApiErrors(404, 'user is not found in temp user')
        }

        if (!tempUser.isVerified) {
            throw new ApiErrors(400, 'user is not verified')
        }

        const hashPass = await bcrypt.hash(password, 12)
        const user = await Users.findOneAndUpdate(
            { email },
            { password: hashPass },
            { new: truncates }
        )

        user.password = undefined

        await tempUser.deleteOne()

        return res
            .status(201)
            .json(
                new ApiResponse(200, user, 'password reset successfully')
            )
    })
]

export const getUsers = AsyncHandler(async(req, res)=>{
    const user = req?.user
    if (!user) {
        throw new ApiErrors(404, 'user not found')
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, 'user data fetched successfully')
        )
})