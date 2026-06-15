import { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error.js";
import { hashPassword } from "../utils/password.js";
import { prisma } from "../utils/prisma.js";
const employeeInclude = {
    divisi: true,
    jabatan: true,
    user: {
        select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
    },
};
const formatEmployee = (employee) => {
    return {
        id: employee.id,
        nik: employee.nik,
        namaLengkap: employee.namaLengkap,
        status: employee.status,
        photoUrl: employee.photoUrl,
        divisi: {
            id: employee.divisi.id,
            name: employee.divisi.name,
        },
        jabatan: {
            id: employee.jabatan.id,
            name: employee.jabatan.name,
        },
        user: employee.user
            ? {
                id: employee.user.id,
                username: employee.user.username,
                role: employee.user.role,
                isActive: employee.user.isActive,
            }
            : null,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
    };
};
const resolveDivision = async (tx, payload) => {
    if (payload.divisiId) {
        const division = await tx.division.findUnique({
            where: { id: payload.divisiId },
        });
        if (!division) {
            throw new AppError(404, "Divisi tidak ditemukan");
        }
        return division;
    }
    if (!payload.divisiName) {
        throw new AppError(422, "Nama divisi wajib diisi");
    }
    return tx.division.upsert({
        where: { name: payload.divisiName },
        update: {},
        create: { name: payload.divisiName },
    });
};
const resolvePosition = async (tx, payload) => {
    if (payload.jabatanId) {
        const position = await tx.position.findUnique({
            where: { id: payload.jabatanId },
        });
        if (!position) {
            throw new AppError(404, "Jabatan tidak ditemukan");
        }
        return position;
    }
    if (!payload.jabatanName) {
        throw new AppError(422, "Nama jabatan wajib diisi");
    }
    const existingPosition = await tx.position.findFirst({
        where: { name: payload.jabatanName },
    });
    if (existingPosition) {
        return existingPosition;
    }
    return tx.position.create({
        data: { name: payload.jabatanName },
    });
};
const mapUniqueConstraintError = (error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
            ? error.meta.target.join(", ")
            : "data unik";
        throw new AppError(409, `${target} sudah digunakan`);
    }
    throw error;
};
export const employeeService = {
    async createEmployee(payload) {
        const passwordHash = await hashPassword(payload.password);
        try {
            const employee = await prisma.$transaction(async (tx) => {
                const existingUser = await tx.user.findUnique({
                    where: { username: payload.username },
                    select: { id: true },
                });
                if (existingUser) {
                    throw new AppError(409, "Username sudah digunakan");
                }
                const existingEmployee = await tx.employee.findUnique({
                    where: { nik: payload.nik },
                    select: { id: true },
                });
                if (existingEmployee) {
                    throw new AppError(409, "NIK sudah digunakan");
                }
                const division = await resolveDivision(tx, payload);
                const position = await resolvePosition(tx, payload);
                const createdEmployee = await tx.employee.create({
                    data: {
                        nik: payload.nik,
                        namaLengkap: payload.namaLengkap,
                        divisiId: division.id,
                        jabatanId: position.id,
                        status: payload.status,
                        photoUrl: payload.photoUrl ?? null,
                    },
                });
                await tx.user.create({
                    data: {
                        username: payload.username,
                        passwordHash,
                        role: "KARYAWAN",
                        employeeId: createdEmployee.id,
                        isActive: true,
                    },
                });
                const employeeWithRelations = await tx.employee.findUniqueOrThrow({
                    where: { id: createdEmployee.id },
                    include: employeeInclude,
                });
                return employeeWithRelations;
            });
            return formatEmployee(employee);
        }
        catch (error) {
            mapUniqueConstraintError(error);
        }
    },
    async listEmployees(query) {
        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;
        const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.divisionId ? { divisiId: query.divisionId } : {}),
            ...(query.search
                ? {
                    OR: [
                        {
                            namaLengkap: {
                                contains: query.search,
                                mode: "insensitive",
                            },
                        },
                        {
                            nik: {
                                contains: query.search,
                                mode: "insensitive",
                            },
                        },
                        {
                            divisi: {
                                name: {
                                    contains: query.search,
                                    mode: "insensitive",
                                },
                            },
                        },
                        {
                            user: {
                                username: {
                                    contains: query.search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    ],
                }
                : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.employee.findMany({
                where,
                include: employeeInclude,
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            }),
            prisma.employee.count({ where }),
        ]);
        return {
            items: items.map(formatEmployee),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
};
//# sourceMappingURL=employee.service.js.map