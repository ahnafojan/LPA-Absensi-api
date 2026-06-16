import { prisma } from "../../src/utils/prisma.js";
import { hashPassword } from "../../src/utils/password.js";

const divisions = [
  "HR & Admin",
  "Produksi - Line 1",
  "Produksi - Line 2",
  "Produksi - Line 4",
  "Logistik",
  "Quality Control",
];

const positions = ["HRD Staff", "Admin", "Operator", "Staff Gudang", "QC Staff"];

const shifts = [
  { name: "Shift Pagi", startTime: "07:00", endTime: "15:00", isWorkingDay: true },
  { name: "Shift Siang", startTime: "15:00", endTime: "23:00", isWorkingDay: true },
  { name: "Shift Malam", startTime: "23:00", endTime: "07:00", isWorkingDay: true },
  { name: "Libur", startTime: "00:00", endTime: "00:00", isWorkingDay: false },
];

const dummyEmployees = [
  {
    username: "andi.line4",
    nik: "202301081",
    namaLengkap: "Andi Saputra",
    divisi: "Produksi - Line 4",
    jabatan: "Operator",
  },
  {
    username: "budi.kusuma",
    nik: "202301082",
    namaLengkap: "Budi Kusuma",
    divisi: "Logistik",
    jabatan: "Staff Gudang",
  },
  {
    username: "citra.triana",
    nik: "202301083",
    namaLengkap: "Citra Triana",
    divisi: "HR & Admin",
    jabatan: "Admin",
  },
  {
    username: "dedi.riswan",
    nik: "202301084",
    namaLengkap: "Dedi Riswan",
    divisi: "Quality Control",
    jabatan: "QC Staff",
  },
  {
    username: "eka.mahendra",
    nik: "202301085",
    namaLengkap: "Eka Mahendra",
    divisi: "Produksi - Line 2",
    jabatan: "Operator",
  },
  {
    username: "fajar.nugroho",
    nik: "202301086",
    namaLengkap: "Fajar Nugroho",
    divisi: "Produksi - Line 1",
    jabatan: "Operator",
  },
] as const;

const attendanceEmployeeNiks = [
  ...dummyEmployees.map((employee) => employee.nik),
  "202301087",
] as const;

const june2026Start = () => new Date(2026, 5, 1);
const july2026Start = () => new Date(2026, 6, 1);
const attendanceRangeStart = () => new Date(2026, 5, 16);
const attendanceRangeEnd = () => new Date(2026, 5, 31);

const attendanceDailyStatuses = [
  {
    day: 16,
    statuses: ["HADIR", "TERLAMBAT", "IZIN", "BELUM_ABSEN", "HADIR", "ALFA", "HADIR"],
  },
  {
    day: 17,
    statuses: ["TERLAMBAT", "HADIR", "TERLAMBAT", "IZIN", "ALFA", "HADIR", "BELUM_ABSEN"],
  },
  {
    day: 18,
    statuses: ["HADIR", "HADIR", "TERLAMBAT", "HADIR", "IZIN", "BELUM_ABSEN", "ALFA"],
  },
  {
    day: 19,
    statuses: ["IZIN", "TERLAMBAT", "HADIR", "HADIR", "BELUM_ABSEN", "HADIR", "HADIR"],
  },
  {
    day: 20,
    statuses: ["BELUM_ABSEN", "BELUM_ABSEN", "HADIR", "TERLAMBAT", "HADIR", "IZIN", "TERLAMBAT"],
  },
  {
    day: 21,
    statuses: ["BELUM_ABSEN", "IZIN", "HADIR", "ALFA", "TERLAMBAT", "BELUM_ABSEN", "IZIN"],
  },
  {
    day: 22,
    statuses: ["HADIR", "HADIR", "BELUM_ABSEN", "IZIN", "ALFA", "TERLAMBAT", "HADIR"],
  },
  {
    day: 23,
    statuses: ["TERLAMBAT", "ALFA", "HADIR", "HADIR", "IZIN", "TERLAMBAT", "TERLAMBAT"],
  },
  {
    day: 24,
    statuses: ["HADIR", "IZIN", "TERLAMBAT", "BELUM_ABSEN", "HADIR", "ALFA", "HADIR"],
  },
  {
    day: 25,
    statuses: ["ALFA", "HADIR", "IZIN", "TERLAMBAT", "BELUM_ABSEN", "HADIR", "IZIN"],
  },
  {
    day: 26,
    statuses: ["HADIR", "TERLAMBAT", "BELUM_ABSEN", "HADIR", "IZIN", "ALFA", "HADIR"],
  },
  {
    day: 27,
    statuses: ["IZIN", "HADIR", "ALFA", "BELUM_ABSEN", "TERLAMBAT", "HADIR", "ALFA"],
  },
  {
    day: 28,
    statuses: ["BELUM_ABSEN", "TERLAMBAT", "HADIR", "IZIN", "ALFA", "HADIR", "BELUM_ABSEN"],
  },
  {
    day: 29,
    statuses: ["HADIR", "HADIR", "TERLAMBAT", "ALFA", "IZIN", "BELUM_ABSEN", "HADIR"],
  },
  {
    day: 30,
    statuses: ["TERLAMBAT", "BELUM_ABSEN", "IZIN", "HADIR", "HADIR", "ALFA", "TERLAMBAT"],
  },
] as const;

type SeedAttendanceStatus =
  (typeof attendanceDailyStatuses)[number]["statuses"][number];

const attendanceCheckInTimes = ["06:52", "06:55", "06:58", "07:00"] as const;
const lateCheckInTimes = ["07:12", "07:18", "07:25", "07:32"] as const;

const withTime = (date: Date, time: string | null) => {
  if (!time) return null;

  const [hour, minute] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hour ?? 0, minute ?? 0, 0, 0);
  return result;
};

const getAttendancePayload = (
  date: Date,
  status: SeedAttendanceStatus,
  employeeIndex: number,
  day: number,
) => {
  if (status === "HADIR") {
    const checkIn =
      attendanceCheckInTimes[(employeeIndex + day) % attendanceCheckInTimes.length] ??
      "06:55";

    return {
      status,
      checkInAt: withTime(date, checkIn),
      checkOutAt: withTime(date, "15:05"),
      lateMinutes: 0,
      note: null,
    };
  }

  if (status === "TERLAMBAT") {
    const checkIn =
      lateCheckInTimes[(employeeIndex + day) % lateCheckInTimes.length] ??
      "07:15";
    const lateMinutes = Number(checkIn.slice(3, 5));

    return {
      status,
      checkInAt: withTime(date, checkIn),
      checkOutAt: withTime(date, "15:10"),
      lateMinutes,
      note: `Terlambat ${lateMinutes} menit`,
    };
  }

  if (status === "IZIN") {
    return {
      status,
      checkInAt: null,
      checkOutAt: null,
      lateMinutes: 0,
      note: "Izin dummy seed",
    };
  }

  if (status === "ALFA") {
    return {
      status,
      checkInAt: null,
      checkOutAt: null,
      lateMinutes: 0,
      note: "Tidak hadir tanpa keterangan",
    };
  }

  return {
    status,
    checkInAt: null,
    checkOutAt: null,
    lateMinutes: 0,
    note: null,
  };
};

const findOrCreatePosition = async (name: string) => {
  const existing = await prisma.position.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.position.create({ data: { name } });
};

const findOrCreateShift = async (data: {
  name: string;
  startTime: string;
  endTime: string;
  isWorkingDay: boolean;
}) => {
  const existing = await prisma.shift.findFirst({ where: { name: data.name } });

  if (existing) {
    return prisma.shift.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.shift.create({ data });
};

export const seedDummyEmployees = async () => {
  const passwordHash = await hashPassword("123");

  for (const name of divisions) {
    await prisma.division.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of positions) {
    await findOrCreatePosition(name);
  }

  const shiftMap = new Map<string, { id: string }>();

  for (const shift of shifts) {
    const savedShift = await findOrCreateShift(shift);
    shiftMap.set(savedShift.name, savedShift);
  }

  const employeeIds: string[] = [];
  const employeeIdByNik = new Map<string, string>();

  for (const item of dummyEmployees) {
    const division = await prisma.division.findUniqueOrThrow({
      where: { name: item.divisi },
    });

    const position = await findOrCreatePosition(item.jabatan);

    const employee = await prisma.employee.upsert({
      where: { nik: item.nik },
      update: {
        namaLengkap: item.namaLengkap,
        divisiId: division.id,
        jabatanId: position.id,
        status: "AKTIF",
      },
      create: {
        nik: item.nik,
        namaLengkap: item.namaLengkap,
        divisiId: division.id,
        jabatanId: position.id,
        status: "AKTIF",
      },
    });

    employeeIds.push(employee.id);
    employeeIdByNik.set(item.nik, employee.id);

    await prisma.user.upsert({
      where: { username: item.username },
      update: {
        passwordHash,
        role: "KARYAWAN",
        employeeId: employee.id,
        isActive: true,
      },
      create: {
        username: item.username,
        passwordHash,
        role: "KARYAWAN",
        employeeId: employee.id,
        isActive: true,
      },
    });
  }

  const mainEmployee = await prisma.employee.findUnique({
    where: { nik: "202301087" },
  });

  if (mainEmployee) {
    employeeIds.push(mainEmployee.id);
    employeeIdByNik.set("202301087", mainEmployee.id);
  }

  const monthStart = june2026Start();
  const nextMonthStart = july2026Start();
  const rangeStart = attendanceRangeStart();
  const rangeEnd = attendanceRangeEnd();
  const shiftPagi = shiftMap.get("Shift Pagi");
  const shiftSiang = shiftMap.get("Shift Siang");
  const shiftMalam = shiftMap.get("Shift Malam");
  const shiftLibur = shiftMap.get("Libur");

  if (shiftPagi && shiftSiang && shiftMalam && shiftLibur) {
    await prisma.schedule.deleteMany({
      where: {
        employeeId: { in: employeeIds },
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });

    const schedules = [];

    for (
      let date = new Date(rangeStart);
      date < rangeEnd;
      date.setDate(date.getDate() + 1)
    ) {
      const day = date.getDay();
      const isWeekend = day === 0 || day === 6;

      for (const [employeeIndex, employeeId] of employeeIds.entries()) {
        const weekdayShifts = [shiftPagi, shiftSiang, shiftMalam] as const;
        const weekdayShift =
          weekdayShifts[(date.getDate() + employeeIndex) % weekdayShifts.length] ??
          shiftPagi;
        const shiftId = isWeekend
          ? shiftLibur.id
          : weekdayShift.id;

        schedules.push({
          employeeId,
          shiftId,
          date: new Date(date),
          weekNumber: Math.ceil(date.getDate() / 7),
          note: isWeekend ? "Libur akhir pekan" : "Jadwal dummy",
        });
      }
    }

    await prisma.schedule.createMany({
      data: schedules,
    });
  }

  await prisma.attendance.deleteMany({
    where: {
      employeeId: { in: employeeIds },
      source: "DUMMY",
      date: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
  });

  let attendanceRows = 0;

  for (const dailyStatus of attendanceDailyStatuses) {
    const date = new Date(2026, 5, dailyStatus.day);

    for (const [employeeIndex, nik] of attendanceEmployeeNiks.entries()) {
      const employeeId = employeeIdByNik.get(nik);
      const status = dailyStatus.statuses[employeeIndex];

      if (!employeeId || !status) {
        continue;
      }

      const payload = getAttendancePayload(date, status, employeeIndex, dailyStatus.day);

      await prisma.attendance.create({
        data: {
          employeeId,
          date,
          ...payload,
          source: "DUMMY",
        },
      });

      attendanceRows += 1;
    }
  }

  return {
    employees: dummyEmployees.length,
    schedulesForEmployees: employeeIds.length,
    attendanceRows,
    attendanceFrom: "2026-06-16",
    attendanceTo: "2026-06-30",
  };
};
