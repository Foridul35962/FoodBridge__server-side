import jwt from 'jsonwebtoken'

export const generateToken = (userId)=>{
    return jwt.sign(
        {userId},
        process.env.TOKEN_SECRET,
        {expiresIn: process.env.TOKEN_EXPIRY}
    )
}