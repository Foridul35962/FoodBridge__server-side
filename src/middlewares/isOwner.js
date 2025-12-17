import ApiErrors from "../utils/ApiErrors.js";
import AsyncHandler from "../utils/AsyncHandler.js";

const isOwner = AsyncHandler(async (req, res, next) => {
    const user = req.user
    if (user.role !== 'owner') {
        throw new ApiErrors(401, 'user is not owner')
    }
    next()
})

export default isOwner