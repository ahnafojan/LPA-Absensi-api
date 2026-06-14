import { createMiddleware } from "hono/factory";
import type { AppEnv, UserRole } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";

export const requireRole = (...roles: UserRole[]) => {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authUser = c.get("authUser");

    if (!roles.includes(authUser.role)) {
      throw new AppError(403, "Akses ditolak");
    }

    await next();
  });
};
