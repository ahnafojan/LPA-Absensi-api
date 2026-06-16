import { AppError } from "../utils/app-error.js";
import { prisma } from "../utils/prisma.js";
const startOfToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const nextDay = (date) => {
    const result = new Date(date);
    result.setDate(result.getDate() + 1);
    return result;
};
const monthRange = (month) => {
    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthNumber = Number(monthText);
    if (!yearText || !monthText || Number.isNaN(year) || Number.isNaN(monthNumber)) {
        throw new AppError(422, "Format month harus YYYY-MM");
    }
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 1);
    return { start, end };
};
const getEmployeeIdByUserId = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            employeeId: true,
        },
    });
    if (!user?.employeeId) {
        throw new AppError(404, "Data karyawan tidak ditemukan");
    }
    return user.employeeId;
};
const attendanceInclude = {
    employee: {
        include: {
            divisi: true,
            jabatan: true,
        },
    },
};
const formatEmployee = (employee) => {
    return {
        id: employee.id,
        nik: employee.nik,
        namaLengkap: employee.namaLengkap,
        divisi: {
            id: employee.divisi.id,
            name: employee.divisi.name,
        },
        jabatan: {
            id: employee.jabatan.id,
            name: employee.jabatan.name,
        },
    };
};
const formatAttendance = (attendance, shift) => {
    return {
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        checkInAt: attendance.checkInAt,
        checkOutAt: attendance.checkOutAt,
        lateMinutes: attendance.lateMinutes,
        note: attendance.note,
        employee: formatEmployee(attendance.employee),
        shift: shift ?? null,
    };
};
export const attendanceService = {
    async getTodaySummary() {
        const today = startOfToday();
        const [hadir, terlambat, izin, alfa, belumAbsen] = await prisma.$transaction([
            prisma.attendance.count({
                where: { date: today, status: "HADIR" },
            }),
            prisma.attendance.count({
                where: { date: today, status: "TERLAMBAT" },
            }),
            prisma.attendance.count({
                where: { date: today, status: "IZIN" },
            }),
            prisma.attendance.count({
                where: { date: today, status: "ALFA" },
            }),
            prisma.attendance.count({
                where: { date: today, status: "BELUM_ABSEN" },
            }),
        ]);
        return {
            hadir,
            terlambat,
            izin,
            alfa,
            belumAbsen,
        };
    },
    async getRealtimeAttendance(query) {
        const today = startOfToday();
        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;
        const where = {
            date: today,
            ...(query.status ? { status: query.status } : {}),
            employee: {
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
                                jabatan: {
                                    name: {
                                        contains: query.search,
                                        mode: "insensitive",
                                    },
                                },
                            },
                        ],
                    }
                    : {}),
            },
        };
        const scheduleWhere = {
            date: today,
            ...(query.shiftId ? { shiftId: query.shiftId } : {}),
        };
        if (query.shiftId) {
            const schedules = await prisma.schedule.findMany({
                where: scheduleWhere,
                select: { employeeId: true },
            });
            where.employeeId = {
                in: schedules.map((schedule) => schedule.employeeId),
            };
        }
        const [items, total] = await prisma.$transaction([
            prisma.attendance.findMany({
                where,
                include: attendanceInclude,
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            }),
            prisma.attendance.count({ where }),
        ]);
        const schedules = await prisma.schedule.findMany({
            where: {
                date: today,
                employeeId: {
                    in: items.map((item) => item.employeeId),
                },
            },
            include: {
                shift: true,
            },
        });
        const scheduleByEmployeeId = new Map(schedules.map((schedule) => [schedule.employeeId, schedule]));
        return {
            items: items.map((attendance) => {
                const schedule = scheduleByEmployeeId.get(attendance.employeeId);
                return formatAttendance(attendance, schedule?.shift ?? null);
            }),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getMyTodayAttendance(userId) {
        const employeeId = await getEmployeeIdByUserId(userId);
        const today = startOfToday();
        const tomorrow = nextDay(today);
        const attendance = await prisma.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: today,
                },
            },
            include: attendanceInclude,
        });
        const schedule = await prisma.schedule.findFirst({
            where: {
                employeeId,
                date: today,
            },
            include: {
                shift: true,
            },
        });
        if (attendance) {
            return {
                id: attendance.id,
                date: attendance.date,
                status: attendance.status,
                checkInAt: attendance.checkInAt,
                checkOutAt: attendance.checkOutAt,
                lateMinutes: attendance.lateMinutes,
                note: attendance.note,
                shift: schedule?.shift
                    ? {
                        id: schedule.shift.id,
                        name: schedule.shift.name,
                        startTime: schedule.shift.startTime,
                        endTime: schedule.shift.endTime,
                    }
                    : null,
            };
        }
        const approvedIzin = await prisma.izin.findFirst({
            where: {
                employeeId,
                status: "DISETUJUI",
                tanggalMulai: {
                    lt: tomorrow,
                },
                OR: [
                    {
                        tanggalSelesai: null,
                    },
                    {
                        tanggalSelesai: {
                            gte: today,
                        },
                    },
                ],
            },
        });
        if (approvedIzin) {
            return {
                id: null,
                date: today,
                status: "IZIN",
                checkInAt: null,
                checkOutAt: null,
                lateMinutes: 0,
                note: approvedIzin.keterangan,
                shift: schedule?.shift ?? null,
            };
        }
        const approvedLeave = await prisma.leaveRequest.findFirst({
            where: {
                employeeId,
                status: "DISETUJUI",
                startDate: {
                    lt: tomorrow,
                },
                endDate: {
                    gte: today,
                },
            },
        });
        if (approvedLeave) {
            return {
                id: null,
                date: today,
                status: "IZIN",
                checkInAt: null,
                checkOutAt: null,
                lateMinutes: 0,
                note: approvedLeave.reason,
                shift: schedule?.shift ?? null,
            };
        }
        if (schedule?.shift.isWorkingDay) {
            return {
                id: null,
                date: today,
                status: "BELUM_ABSEN",
                checkInAt: null,
                checkOutAt: null,
                lateMinutes: 0,
                note: null,
                shift: schedule.shift,
            };
        }
        return null;
    },
    async getMyAttendanceHistory(userId, query) {
        const employeeId = await getEmployeeIdByUserId(userId);
        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;
        const where = {
            employeeId,
            ...(query.status ? { status: query.status } : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.attendance.findMany({
                where,
                orderBy: {
                    date: "desc",
                },
                skip,
                take: limit,
            }),
            prisma.attendance.count({ where }),
        ]);
        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getMyMonthlyRecap(userId, query) {
        const employeeId = await getEmployeeIdByUserId(userId);
        const { start, end } = monthRange(query.month);
        const [hadir, terlambat, izin, alfa, belumAbsen] = await prisma.$transaction([
            prisma.attendance.count({
                where: {
                    employeeId,
                    date: { gte: start, lt: end },
                    status: "HADIR",
                },
            }),
            prisma.attendance.count({
                where: {
                    employeeId,
                    date: { gte: start, lt: end },
                    status: "TERLAMBAT",
                },
            }),
            prisma.attendance.count({
                where: {
                    employeeId,
                    date: { gte: start, lt: end },
                    status: "IZIN",
                },
            }),
            prisma.attendance.count({
                where: {
                    employeeId,
                    date: { gte: start, lt: end },
                    status: "ALFA",
                },
            }),
            prisma.attendance.count({
                where: {
                    employeeId,
                    date: { gte: start, lt: end },
                    status: "BELUM_ABSEN",
                },
            }),
        ]);
        return {
            month: query.month,
            hadir,
            terlambat,
            izin,
            alfa,
            belumAbsen,
        };
    },
};
//# sourceMappingURL=attendance.service.js.map