import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { loginRateLimit } from "../middleware/rate-limit.middleware.js";
import { authService } from "../services/auth.service.js";
import type { AppEnv } from "../types/auth.js";
import {
  loginBodySchema,
  logoutBodySchema,
  refreshTokenBodySchema,
} from "../validators/auth.validator.js";
import { parseJsonBody, parseOptionalJsonBody } from "../utils/request.js";
import { successResponse } from "../utils/response.js";

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/login", loginRateLimit, async (c) => {
  const body = await parseJsonBody(c, loginBodySchema);
  const data = await authService.login(body);

  return successResponse(c, data, "Login berhasil");
});

authRoutes.post("/refresh", async (c) => {
  const body = await parseJsonBody(c, refreshTokenBodySchema);
  const data = await authService.refresh(body.refreshToken);

  return successResponse(c, data, "Token berhasil diperbarui");
});

authRoutes.post("/logout", authMiddleware, async (c) => {
  const body = await parseOptionalJsonBody(c, logoutBodySchema);
  const authUser = c.get("authUser");
  const data = await authService.logout(authUser.id, body.refreshToken);

  return successResponse(c, data, "Logout berhasil");
});

authRoutes.get("/me", authMiddleware, async (c) => {
  const authUser = c.get("authUser");
  const data = await authService.me(authUser.id);

  return successResponse(c, data, "Data user aktif");
});
