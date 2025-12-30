import { isSpoofedBot } from "@arcjet/inspect";
import aj from "../config/arjet.js";
import AsyncHandler from "../utils/AsyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";

const arcjetProtection = AsyncHandler(async (req, res, next) => {
    try {
        const decision = await aj.protect(req);

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                throw new ApiErrors(429, "Rate limit exceeded. Please try again later.");
            }
            else if (decision.reason.isBot()) {
                throw new ApiErrors(403, "Bot access denied.");
            }
            else {
                throw new ApiErrors(403, "Access denied by security policy.");
            }
        }

        if (decision.ip.isHosting()) {
            throw new ApiErrors(403, "Hosting / VPN IPs are not allowed.");
        }

        if (decision.results.some(isSpoofedBot)) {
            throw new ApiErrors(403, "Malicious bot activity detected.");
        }

        next();
    } catch (error) {
        next(error);
    }
});

export default arcjetProtection;