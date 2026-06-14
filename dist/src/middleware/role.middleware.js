import { createMiddleware } from "hono/factory";
import { AppError } from "../utils/app-error.js";
export const requireRole = (...roles) => {
    return createMiddleware(async (c, next) => {
        const authUser = c.get("authUser");
        if (!roles.includes(authUser.role)) {
            throw new AppError(403, "Akses ditolak");
        }
        await next();
    });
};
//# sourceMappingURL=role.middleware.js.map