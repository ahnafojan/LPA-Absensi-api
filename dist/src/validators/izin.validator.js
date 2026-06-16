import { z } from "zod";
export const izinTipeSchema = z.enum([
    "sakit",
    "cuti",
    "keperluan_pribadi",
    "duka",
    "lainnya",
]);
export const izinStatusSchema = z.enum(["menunggu", "disetujui", "ditolak"]);
const normalizeDateInput = (value) => {
    if (typeof value !== "string") {
        return value;
    }
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return trimmedValue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
        return trimmedValue;
    }
    const dateOnlyMatch = /^(\d{4}-\d{2}-\d{2})T/.exec(trimmedValue);
    if (dateOnlyMatch?.[1]) {
        return dateOnlyMatch[1];
    }
    return trimmedValue;
};
const normalizeOptionalDateInput = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "string" && value.trim() === "") {
        return undefined;
    }
    return normalizeDateInput(value);
};
const isValidDateOnly = (value) => {
    const [yearText, monthText, dayText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day);
};
const dateOnlySchema = z.preprocess(normalizeDateInput, z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .refine((value) => isValidDateOnly(value), {
    message: "Tanggal tidak valid",
}));
const optionalDateOnlySchema = z.preprocess(normalizeOptionalDateInput, dateOnlySchema.optional());
export const myIzinQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    status: izinStatusSchema.optional(),
    tipe: izinTipeSchema.optional(),
});
export const hrdIzinQuerySchema = myIzinQuerySchema.extend({
    search: z.string().trim().optional(),
});
export const createIzinBodySchema = z
    .object({
    tipe: izinTipeSchema,
    tanggalMulai: dateOnlySchema,
    tanggalSelesai: optionalDateOnlySchema,
    keterangan: z
        .string()
        .trim()
        .min(3, "Keterangan minimal 3 karakter")
        .max(1000, "Keterangan maksimal 1000 karakter"),
})
    .superRefine((data, ctx) => {
    const tanggalMulai = new Date(`${data.tanggalMulai}T00:00:00.000Z`);
    const tanggalSelesai = data.tanggalSelesai
        ? new Date(`${data.tanggalSelesai}T00:00:00.000Z`)
        : null;
    if (tanggalSelesai && tanggalSelesai < tanggalMulai) {
        ctx.addIssue({
            code: "custom",
            path: ["tanggalSelesai"],
            message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
        });
    }
});
export const rejectIzinBodySchema = z.object({
    alasanPenolakan: z
        .string()
        .trim()
        .min(3, "Alasan penolakan minimal 3 karakter")
        .max(1000, "Alasan penolakan maksimal 1000 karakter"),
});
//# sourceMappingURL=izin.validator.js.map