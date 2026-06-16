import { prisma } from "../../src/utils/prisma.js";

const labelByTipe = {
  SAKIT: "Izin Sakit",
  CUTI: "Cuti Tahunan",
  KEPERLUAN_PRIBADI: "Izin Keperluan Pribadi",
  DUKA: "Izin Duka",
  LAINNYA: "Izin Lainnya",
} as const;

const dateOnlyFromToday = (offset: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
};

export const seedIzin = async () => {
  const hrdUser = await prisma.user.findUnique({
    where: { username: "hrd" },
    select: { id: true },
  });

  const employees = await prisma.employee.findMany({
    where: {
      nik: {
        in: [
          "202301081",
          "202301082",
          "202301083",
          "202301084",
          "202301085",
          "202301086",
          "202301087",
        ],
      },
    },
    select: {
      id: true,
      nik: true,
    },
  });

  const employeeByNik = new Map(employees.map((employee) => [employee.nik, employee.id]));
  const employeeIds = employees.map((employee) => employee.id);

  if (!hrdUser || employeeIds.length === 0) {
    return { izin: 0 };
  }

  await prisma.izin.deleteMany({
    where: {
      employeeId: {
        in: employeeIds,
      },
      keterangan: {
        startsWith: "[seed izin]",
      },
    },
  });

  const now = new Date();
  const seedItems = [
    {
      nik: "202301087",
      tipe: "CUTI",
      keterangan: "[seed izin] Cuti tahunan untuk urusan keluarga.",
      tanggalMulai: dateOnlyFromToday(2),
      tanggalSelesai: dateOnlyFromToday(3),
      status: "MENUNGGU",
      approvedBy: null,
      approvedAt: null,
      alasanPenolakan: null,
    },
    {
      nik: "202301087",
      tipe: "SAKIT",
      keterangan: "[seed izin] Sakit dan membutuhkan istirahat.",
      tanggalMulai: dateOnlyFromToday(-4),
      tanggalSelesai: dateOnlyFromToday(-4),
      status: "DISETUJUI",
      approvedBy: hrdUser.id,
      approvedAt: now,
      alasanPenolakan: null,
    },
    {
      nik: "202301081",
      tipe: "KEPERLUAN_PRIBADI",
      keterangan: "[seed izin] Mengurus dokumen keluarga.",
      tanggalMulai: dateOnlyFromToday(1),
      tanggalSelesai: dateOnlyFromToday(1),
      status: "MENUNGGU",
      approvedBy: null,
      approvedAt: null,
      alasanPenolakan: null,
    },
    {
      nik: "202301082",
      tipe: "DUKA",
      keterangan: "[seed izin] Menghadiri acara keluarga.",
      tanggalMulai: dateOnlyFromToday(-8),
      tanggalSelesai: dateOnlyFromToday(-7),
      status: "DISETUJUI",
      approvedBy: hrdUser.id,
      approvedAt: now,
      alasanPenolakan: null,
    },
    {
      nik: "202301083",
      tipe: "LAINNYA",
      keterangan: "[seed izin] Keperluan mendadak di luar kota.",
      tanggalMulai: dateOnlyFromToday(-2),
      tanggalSelesai: dateOnlyFromToday(-2),
      status: "DITOLAK",
      approvedBy: hrdUser.id,
      approvedAt: now,
      alasanPenolakan: "Jadwal produksi sedang padat.",
    },
  ] as const;

  const data = seedItems
    .map((item) => {
      const employeeId = employeeByNik.get(item.nik);

      if (!employeeId) {
        return null;
      }

      return {
        employeeId,
        tipe: item.tipe,
        label: labelByTipe[item.tipe],
        keterangan: item.keterangan,
        tanggalMulai: item.tanggalMulai,
        tanggalSelesai: item.tanggalSelesai,
        status: item.status,
        approvedBy: item.approvedBy,
        approvedAt: item.approvedAt,
        alasanPenolakan: item.alasanPenolakan,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  await prisma.izin.createMany({ data });

  return { izin: data.length };
};
