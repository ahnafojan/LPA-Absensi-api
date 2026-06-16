import { z } from "zod";
export const attendanceStatusSchema = z.enum([
    "HADIR",
    "TERLAMBAT",
    "IZIN",
    "ALFA",
    "BELUM_ABSEN",
]);
export const realtimeAttendanceQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    search: z.string().trim().optional(),
    status: attendanceStatusSchema.optional(),
    divisionId: z.string().trim().optional(),
    shiftId: z.string().trim().optional(),
});
export const myAttendanceHistoryQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    status: attendanceStatusSchema.optional(),
});
export const monthlyRecapQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/, "Format month harus YYYY-MM"),
});
//# sourceMappingURL=attendance.validator.js.map