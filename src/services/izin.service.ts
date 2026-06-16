import { Prisma } from "@prisma/client";
import type {
  CreateIzinBody,
  HrdIzinQuery,
  IzinStatusInput,
  IzinTipeInput,
  MyIzinQuery,
  RejectIzinBody,
} from "../validators/izin.validator.js";
import { AppError } from "../utils/app-error.js";
import { prisma } from "../utils/prisma.js";

type IzinDb = Pick<typeof prisma, "$transaction" | "izin" | "user">;

type PrismaIzinTipe =
  | "SAKIT"
  | "CUTI"
  | "KEPERLUAN_PRIBADI"
  | "DUKA"
  | "LAINNYA";

type PrismaIzinStatus = "MENUNGGU" | "DISETUJUI" | "DITOLAK";

type IzinRecord = {
  id: string;
  employeeId: string;
  tipe: PrismaIzinTipe;
  label: string;
  keterangan: string;
  tanggalMulai: Date;
  tanggalSelesai: Date | null;
  status: PrismaIzinStatus;
  alasanPenolakan: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const izinWithEmployeeInclude = {
  employee: {
    include: {
      divisi: true,
    },
  },
} as const;

type IzinWithEmployee = Prisma.IzinGetPayload<{
  include: typeof izinWithEmployeeInclude;
}>;

const CUTI_TAHUNAN_QUOTA = 12;

const tipeToPrisma = {
  sakit: "SAKIT",
  cuti: "CUTI",
  keperluan_pribadi: "KEPERLUAN_PRIBADI",
  duka: "DUKA",
  lainnya: "LAINNYA",
} as const satisfies Record<IzinTipeInput, PrismaIzinTipe>;

const prismaToTipe = {
  SAKIT: "sakit",
  CUTI: "cuti",
  KEPERLUAN_PRIBADI: "keperluan_pribadi",
  DUKA: "duka",
  LAINNYA: "lainnya",
} as const satisfies Record<PrismaIzinTipe, IzinTipeInput>;

const statusToPrisma = {
  menunggu: "MENUNGGU",
  disetujui: "DISETUJUI",
  ditolak: "DITOLAK",
} as const satisfies Record<IzinStatusInput, PrismaIzinStatus>;

const prismaToStatus = {
  MENUNGGU: "menunggu",
  DISETUJUI: "disetujui",
  DITOLAK: "ditolak",
} as const satisfies Record<PrismaIzinStatus, IzinStatusInput>;

const labelByTipe = {
  sakit: "Izin Sakit",
  cuti: "Cuti Tahunan",
  keperluan_pribadi: "Izin Keperluan Pribadi",
  duka: "Izin Duka",
  lainnya: "Izin Lainnya",
} as const satisfies Record<IzinTipeInput, string>;

const parseDateOnly = (date: string) => {
  return new Date(`${date}T00:00:00.000Z`);
};

const toDateOnly = (date: Date | null) => {
  return date ? date.toISOString().slice(0, 10) : null;
};

const toIsoString = (date: Date | null) => {
  return date ? date.toISOString() : null;
};

const getCurrentMonthRange = () => {
  const now = new Date();

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
};

const getCurrentYearRange = () => {
  const now = new Date();

  return {
    start: new Date(Date.UTC(now.getFullYear(), 0, 1)),
    end: new Date(Date.UTC(now.getFullYear() + 1, 0, 1)),
  };
};

const clampDate = (date: Date, min: Date, max: Date) => {
  if (date < min) return min;
  if (date > max) return max;

  return date;
};

const countInclusiveDays = (start: Date, end: Date) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const startUtc = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const endUtc = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );

  return Math.max(0, Math.floor((endUtc - startUtc) / dayMs) + 1);
};

const resolveEmployeeId = async (db: IzinDb, userId: string) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { employeeId: true },
  });

  if (!user?.employeeId) {
    throw new AppError(404, "Data karyawan tidak ditemukan");
  }

  return user.employeeId;
};

const findTipeFromSearch = (search: string) => {
  const normalized = search.toLowerCase().replace(/\s+/g, "_");
  const exactTipe = tipeToPrisma[normalized as IzinTipeInput];

  if (exactTipe) {
    return exactTipe;
  }

  const labelMatch = Object.entries(labelByTipe).find(([, label]) => {
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return labelMatch ? tipeToPrisma[labelMatch[0] as IzinTipeInput] : null;
};

const formatMyIzin = (izin: IzinRecord) => {
  return {
    id: izin.id,
    tipe: prismaToTipe[izin.tipe],
    label: izin.label,
    tanggalMulai: toDateOnly(izin.tanggalMulai),
    tanggalSelesai: toDateOnly(izin.tanggalSelesai),
    status: prismaToStatus[izin.status],
    keterangan: izin.keterangan,
  };
};

const formatHrdIzin = (izin: IzinWithEmployee) => {
  return {
    id: izin.id,
    employee: {
      id: izin.employee.id,
      namaLengkap: izin.employee.namaLengkap,
      nik: izin.employee.nik,
      divisi: {
        name: izin.employee.divisi.name,
      },
    },
    tipe: prismaToTipe[izin.tipe],
    label: izin.label,
    keterangan: izin.keterangan,
    tanggalMulai: toDateOnly(izin.tanggalMulai),
    tanggalSelesai: toDateOnly(izin.tanggalSelesai),
    status: prismaToStatus[izin.status],
    alasanPenolakan: izin.alasanPenolakan,
    approvedAt: toIsoString(izin.approvedAt),
    createdAt: izin.createdAt.toISOString(),
  };
};

const ensurePendingIzin = async (db: IzinDb, id: string) => {
  const izin = await db.izin.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
    },
  });

  if (!izin) {
    throw new AppError(404, "Izin tidak ditemukan");
  }

  if (izin.status !== "MENUNGGU") {
    throw new AppError(400, "Izin sudah disetujui atau ditolak");
  }
};

const findIzinForHrdResponse = async (db: IzinDb, id: string) => {
  const izin = await db.izin.findUnique({
    where: { id },
    include: izinWithEmployeeInclude,
  });

  if (!izin) {
    throw new AppError(404, "Izin tidak ditemukan");
  }

  return formatHrdIzin(izin);
};

const calculateUsedCutiDays = (
  items: Pick<IzinRecord, "tanggalMulai" | "tanggalSelesai">[],
  range: { start: Date; end: Date },
) => {
  const lastDayInRange = new Date(range.end);
  lastDayInRange.setUTCDate(lastDayInRange.getUTCDate() - 1);

  return items.reduce((total, item) => {
    const start = clampDate(item.tanggalMulai, range.start, lastDayInRange);
    const end = clampDate(item.tanggalSelesai ?? item.tanggalMulai, range.start, lastDayInRange);

    return total + countInclusiveDays(start, end);
  }, 0);
};

export const createIzinService = (db: IzinDb = prisma) => {
  return {
    async getMyStat(userId: string) {
      const employeeId = await resolveEmployeeId(db, userId);
      const yearRange = getCurrentYearRange();

      const [totalIzin, approvedCuti] = await db.$transaction([
        db.izin.count({
          where: {
            employeeId,
            status: "DISETUJUI",
          },
        }),
        db.izin.findMany({
          where: {
            employeeId,
            tipe: "CUTI",
            status: "DISETUJUI",
            tanggalMulai: {
              lt: yearRange.end,
            },
            OR: [
              {
                tanggalSelesai: null,
              },
              {
                tanggalSelesai: {
                  gte: yearRange.start,
                },
              },
            ],
          },
          select: {
            tanggalMulai: true,
            tanggalSelesai: true,
          },
        }),
      ]);

      const usedCuti = calculateUsedCutiDays(approvedCuti, yearRange);

      return {
        totalIzin,
        sisaCuti: Math.max(0, CUTI_TAHUNAN_QUOTA - usedCuti),
      };
    },

    async getMyIzin(userId: string, query: MyIzinQuery) {
      const employeeId = await resolveEmployeeId(db, userId);
      const page = query.page;
      const limit = query.limit;
      const skip = (page - 1) * limit;

      const where: Prisma.IzinWhereInput = {
        employeeId,
        ...(query.status ? { status: statusToPrisma[query.status] } : {}),
        ...(query.tipe ? { tipe: tipeToPrisma[query.tipe] } : {}),
      };

      const [items, total] = await db.$transaction([
        db.izin.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),
        db.izin.count({ where }),
      ]);

      return {
        items: items.map(formatMyIzin),
        total,
        page,
        pageSize: limit,
      };
    },

    async submitIzin(userId: string, payload: CreateIzinBody) {
      const employeeId = await resolveEmployeeId(db, userId);

      const izin = await db.izin.create({
        data: {
          employeeId,
          tipe: tipeToPrisma[payload.tipe],
          label: labelByTipe[payload.tipe],
          keterangan: payload.keterangan,
          tanggalMulai: parseDateOnly(payload.tanggalMulai),
          tanggalSelesai: payload.tanggalSelesai
            ? parseDateOnly(payload.tanggalSelesai)
            : null,
          status: "MENUNGGU",
        },
      });

      return formatMyIzin(izin);
    },

    async getHrdSummary() {
      const { start, end } = getCurrentMonthRange();

      const [menunggu, disetujuiBulanIni, ditolakBulanIni, totalBulanIni] =
        await db.$transaction([
          db.izin.count({
            where: {
              status: "MENUNGGU",
            },
          }),
          db.izin.count({
            where: {
              status: "DISETUJUI",
              approvedAt: {
                gte: start,
                lt: end,
              },
            },
          }),
          db.izin.count({
            where: {
              status: "DITOLAK",
              approvedAt: {
                gte: start,
                lt: end,
              },
            },
          }),
          db.izin.count({
            where: {
              createdAt: {
                gte: start,
                lt: end,
              },
            },
          }),
        ]);

      return {
        menunggu,
        disetujuiBulanIni,
        ditolakBulanIni,
        totalBulanIni,
      };
    },

    async getHrdIzin(query: HrdIzinQuery) {
      const page = query.page;
      const limit = query.limit;
      const skip = (page - 1) * limit;
      const search = query.search?.trim();
      const searchedTipe = search ? findTipeFromSearch(search) : null;

      const where: Prisma.IzinWhereInput = {
        ...(query.status ? { status: statusToPrisma[query.status] } : {}),
        ...(query.tipe ? { tipe: tipeToPrisma[query.tipe] } : {}),
        ...(search
          ? {
              OR: [
                {
                  employee: {
                    namaLengkap: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  employee: {
                    nik: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  employee: {
                    divisi: {
                      name: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
                {
                  label: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                ...(searchedTipe ? [{ tipe: searchedTipe }] : []),
              ],
            }
          : {}),
      };

      const [items, total] = await db.$transaction([
        db.izin.findMany({
          where,
          include: izinWithEmployeeInclude,
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),
        db.izin.count({ where }),
      ]);

      return {
        items: items.map(formatHrdIzin),
        total,
        page,
        pageSize: limit,
      };
    },

    async approveIzin(id: string, hrdUserId: string) {
      const result = await db.izin.updateMany({
        where: {
          id,
          status: "MENUNGGU",
        },
        data: {
          status: "DISETUJUI",
          approvedBy: hrdUserId,
          approvedAt: new Date(),
          alasanPenolakan: null,
        },
      });

      if (result.count === 0) {
        await ensurePendingIzin(db, id);
      }

      return findIzinForHrdResponse(db, id);
    },

    async rejectIzin(id: string, hrdUserId: string, payload: RejectIzinBody) {
      const result = await db.izin.updateMany({
        where: {
          id,
          status: "MENUNGGU",
        },
        data: {
          status: "DITOLAK",
          approvedBy: hrdUserId,
          approvedAt: new Date(),
          alasanPenolakan: payload.alasanPenolakan,
        },
      });

      if (result.count === 0) {
        await ensurePendingIzin(db, id);
      }

      return findIzinForHrdResponse(db, id);
    },
  };
};

export const izinService = createIzinService();
