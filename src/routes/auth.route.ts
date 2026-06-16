import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { loginRateLimit } from "../middleware/rate-limit.middleware.js";
import {
  PROFILE_PHOTO_MAX_SIZE,
  authService,
} from "../services/auth.service.js";
import type { AppEnv } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";
import {
  changePasswordBodySchema,
  loginBodySchema,
  logoutBodySchema,
  refreshTokenBodySchema,
  updateProfileBodySchema,
} from "../validators/auth.validator.js";
import { parseJsonBody, parseOptionalJsonBody } from "../utils/request.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const authRoutes = new Hono<AppEnv>();

const getPublicBaseUrl = (url: string, headers: Headers) => {
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(url).origin;
};

const isUploadedFile = (value: unknown): value is File => {
  return typeof File !== "undefined" && value instanceof File;
};

const parseProfilePhoto = async (c: Context<AppEnv>) => {
  const contentType = c.req.header("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    throw new AppError(400, "Content-Type harus multipart/form-data", {
      photo: ["Gunakan multipart/form-data dengan field photo"],
    });
  }

  let body: Awaited<ReturnType<typeof c.req.parseBody>>;

  try {
    body = await c.req.parseBody();
  } catch {
    throw new AppError(400, "Request multipart/form-data tidak valid");
  }

  const photo = body.photo;

  if (!isUploadedFile(photo)) {
    throw new AppError(422, "Validasi gagal", {
      photo: ["Foto wajib diisi"],
    });
  }

  return photo;
};

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
  const data = await authService.me(
    authUser.id,
    getPublicBaseUrl(c.req.url, c.req.raw.headers),
  );

  return successResponse(c, data, "Data user aktif");
});

authRoutes.patch("/me", authMiddleware, async (c) => {
  const body = await parseJsonBody(c, updateProfileBodySchema);
  const authUser = c.get("authUser");
  const data = await authService.updateMe(
    authUser.id,
    authUser.role,
    body,
    getPublicBaseUrl(c.req.url, c.req.raw.headers),
  );

  return successResponse(c, data, "Profil berhasil diperbarui");
});

authRoutes.patch("/me/password", authMiddleware, async (c) => {
  const body = await parseJsonBody(c, changePasswordBodySchema);
  const authUser = c.get("authUser");
  const data = await authService.changePassword(authUser.id, body);

  return successResponse(c, data, "Password berhasil diperbarui");
});

authRoutes.post(
  "/me/photo",
  authMiddleware,
  bodyLimit({
    maxSize: PROFILE_PHOTO_MAX_SIZE + 512 * 1024,
    onError: (c) =>
      errorResponse(c, "Validasi gagal", 422, {
        photo: ["Ukuran foto maksimal 3MB"],
      }),
  }),
  async (c) => {
    const photo = await parseProfilePhoto(c);
    const authUser = c.get("authUser");
    const data = await authService.updateProfilePhoto(
      authUser.id,
      photo,
      getPublicBaseUrl(c.req.url, c.req.raw.headers),
    );

    return successResponse(c, data, "Foto profil berhasil diperbarui");
  },
);

authRoutes.delete("/me/photo", authMiddleware, async (c) => {
  const authUser = c.get("authUser");
  const data = await authService.deleteProfilePhoto(
    authUser.id,
    getPublicBaseUrl(c.req.url, c.req.raw.headers),
  );

  return successResponse(c, data, "Foto profil berhasil dihapus");
});
