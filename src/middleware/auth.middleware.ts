import { createMiddleware } from "hono/factory";
import type { AppEnv, UserRole } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../utils/prisma.js";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authorization = c.req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError(401, "Authorization bearer token wajib diisi");
  }

  const token = authorization.slice("Bearer ".length).trim();
  const payload = verifyAccessToken(token);

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      role: true,
      employeeId: true,
      isActive: true,
    },
  });

  if (!user?.isActive) {
    throw new AppError(401, "Sesi tidak valid");
  }

  c.set("authUser", {
    id: user.id,
    username: user.username,
    role: user.role as UserRole,
    employeeId: user.employeeId,
  });

  await next();
});
