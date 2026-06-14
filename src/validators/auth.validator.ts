import { z } from "zod";

export const loginBodySchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(32, "Refresh token tidak valid"),
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(32, "Refresh token tidak valid").optional(),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
