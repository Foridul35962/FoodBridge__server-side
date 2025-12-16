import jwt from "jsonwebtoken";
import ApiErrors from "../utils/ApiErrors.js";
import AsyncHandler from "../utils/AsyncHandler.js";
import Users from "../models/Users.model.js";

export const protect = AsyncHandler(async(req, res, next)=>{
    const token = req.cookies?.token
    try {
        if (!token) {
            throw new ApiErrors(401, 'unathorize access')
        }
    
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET)

        const user =await Users.findById(decoded.userId).select("-password")
        if (!user) {
            throw new ApiErrors(404, 'user not found')
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiErrors(401, 'Not authorized, token failed')
    }
})

export default protect