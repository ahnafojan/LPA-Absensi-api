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
//# sourceMappingURL=auth.validator.js.map