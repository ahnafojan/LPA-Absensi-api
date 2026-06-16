import { z } from "zod";

const readString = (value: unknown) => {
  return typeof value === "string" ? value : undefined;
};

const normalizeChangePasswordBody = (body: unknown) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const payload = body as Record<string, unknown>;

  return {
    currentPassword:
      readString(payload.currentPassword) ??
      readString(payload.oldPassword) ??
      readString(payload.passwordLama),
    newPassword:
      readString(payload.newPassword) ??
      readString(payload.passwordBaru) ??
      readString(payload.password),
    confirmPassword:
      readString(payload.confirmPassword) ??
      readString(payload.newPasswordConfirmation) ??
      readString(payload.passwordConfirmation) ??
      readString(payload.konfirmasiPassword),
  };
};

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

export const updateProfileBodySchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi"),
    username: z
      .string()
      .trim()
      .min(1, "Username wajib diisi")
      .max(50, "Username maksimal 50 karakter")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username hanya boleh berisi huruf, angka, titik, underscore, atau strip",
      ),
    nik: z.string().trim().min(1, "NIK wajib diisi").optional(),
    divisi: z.string().trim().min(1, "Divisi wajib diisi").optional(),
    jabatan: z.string().trim().min(1, "Jabatan wajib diisi").optional(),
  })
  .strict();

export const changePasswordBodySchema = z.preprocess(
  normalizeChangePasswordBody,
  z
    .object({
      currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
      newPassword: z.string().min(3, "Password baru minimal 3 karakter"),
      confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.currentPassword === data.newPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["newPassword"],
          message: "Password baru tidak boleh sama dengan password saat ini",
        });
      }

      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Konfirmasi password tidak sama",
        });
      }
    }),
);

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
