import { z } from "zod";

const employeeStatusSchema = z.enum([
  "AKTIF",
  "CUTI",
  "NONAKTIF",
  "PERLU_REVIEW",
]);

export const createEmployeeBodySchema = z
  .object({
    namaLengkap: z.string().trim().min(2, "Nama lengkap wajib diisi"),
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username hanya boleh berisi huruf, angka, titik, underscore, atau strip",
      ),
    password: z.string().min(3, "Password minimal 3 karakter"),
    nik: z.string().trim().min(3, "NIK wajib diisi"),
    divisiId: z.string().trim().min(1).optional(),
    divisiName: z.string().trim().min(1).optional(),
    jabatanId: z.string().trim().min(1).optional(),
    jabatanName: z.string().trim().min(1).optional(),
    status: employeeStatusSchema.default("AKTIF"),
    photoUrl: z.string().url("URL foto tidak valid").nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (Boolean(data.divisiId) === Boolean(data.divisiName)) {
      ctx.addIssue({
        code: "custom",
        path: ["divisiId"],
        message: "Isi salah satu: divisiId atau divisiName",
      });
    }

    if (Boolean(data.jabatanId) === Boolean(data.jabatanName)) {
      ctx.addIssue({
        code: "custom",
        path: ["jabatanId"],
        message: "Isi salah satu: jabatanId atau jabatanName",
      });
    }
  });

export type CreateEmployeeBody = z.infer<typeof createEmployeeBodySchema>;

//data karywan
export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().trim().optional(),
  status: employeeStatusSchema.optional(),
  divisionId: z.string().trim().optional(),
});

export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
