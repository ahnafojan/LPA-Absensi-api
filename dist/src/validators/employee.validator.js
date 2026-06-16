import { z } from "zod";
const employeeStatusSchema = z.enum([
    "AKTIF",
    "CUTI",
    "NONAKTIF",
    "PERLU_REVIEW",
]);
const readString = (value) => {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
};
const resolveNamedReference = (value) => {
    if (typeof value === "string") {
        return { name: readString(value) };
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value;
        return {
            id: readString(record.id),
            name: readString(record.name) ??
                readString(record.nama) ??
                readString(record.label),
        };
    }
    return {};
};
const normalizeEmployeeStatus = (value) => {
    if (typeof value !== "string") {
        return value;
    }
    return value.trim().toUpperCase();
};
const normalizeCreateEmployeeBody = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return body;
    }
    const payload = { ...body };
    payload.namaLengkap ??=
        readString(payload.nama) ??
            readString(payload.name) ??
            readString(payload.fullName);
    payload.nik ??= readString(payload.NIK);
    payload.photoUrl ??= readString(payload.photoUri);
    payload.status = normalizeEmployeeStatus(payload.status ?? "AKTIF");
    const divisi = resolveNamedReference(payload.divisi);
    const division = resolveNamedReference(payload.division);
    const jabatan = resolveNamedReference(payload.jabatan);
    const position = resolveNamedReference(payload.position);
    payload.divisiId ??= readString(payload.divisionId) ?? divisi.id ?? division.id;
    payload.divisiName ??=
        readString(payload.divisionName) ??
            readString(payload.namaDivisi) ??
            divisi.name ??
            division.name;
    payload.jabatanId ??= readString(payload.positionId) ?? jabatan.id ?? position.id;
    payload.jabatanName ??=
        readString(payload.positionName) ??
            readString(payload.namaJabatan) ??
            jabatan.name ??
            position.name;
    return payload;
};
export const createEmployeeBodySchema = z.preprocess(normalizeCreateEmployeeBody, z
    .object({
    namaLengkap: z.string().trim().min(2, "Nama lengkap wajib diisi"),
    username: z
        .string()
        .trim()
        .min(3, "Username minimal 3 karakter")
        .max(50, "Username maksimal 50 karakter")
        .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berisi huruf, angka, titik, underscore, atau strip"),
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
}));
//data karywan
export const listEmployeesQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    search: z.string().trim().optional(),
    status: employeeStatusSchema.optional(),
    divisionId: z.string().trim().optional(),
});
//# sourceMappingURL=employee.validator.js.map