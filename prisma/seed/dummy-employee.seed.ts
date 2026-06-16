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
    attendance: { status: "HADIR", checkIn: "06:54", lateMinutes: 0 },
  },
  {
    username: "budi.kusuma",
    nik: "202301082",
    namaLengkap: "Budi Kusuma",
    divisi: "Logistik",
    jabatan: "Staff Gudang",
    attendance: { status: "TERLAMBAT", checkIn: "07:28", lateMinutes: 28 },
  },
  {
    username: "citra.triana",
    nik: "202301083",
    namaLengkap: "Citra Triana",
    divisi: "HR & Admin",
    jabatan: "Admin",
    attendance: { status: "IZIN", checkIn: null, lateMinutes: 0 },
  },
  {
    username: "dedi.riswan",
    nik: "202301084",
    namaLengkap: "Dedi Riswan",
    divisi: "Quality Control",
    jabatan: "QC Staff",
    attendance: { status: "BELUM_ABSEN", checkIn: null, lateMinutes: 0 },
  },
  {
    username: "eka.mahendra",
    nik: "202301085",
    namaLengkap: "Eka Mahendra",
    divisi: "Produksi - Line 2",
    jabatan: "Operator",
    attendance: { status: "HADIR", checkIn: "06:58", lateMinutes: 0 },
  },
  {
    username: "fajar.nugroho",
    nik: "202301086",
    namaLengkap: "Fajar Nugroho",
    divisi: "Produksi - Line 1",
    jabatan: "Operator",
    attendance: { status: "ALFA", checkIn: null, lateMinutes: 0 },
  },
] as const;

const today = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const withTime = (date: Date, time: string | null) => {
  if (!time) return null;

  const [hour, minute] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hour ?? 0, minute ?? 0, 0, 0);
  return result;
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

    const date = today();

    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date,
        },
      },
      update: {
        status: item.attendance.status,
        checkInAt: withTime(date, item.attendance.checkIn),
        lateMinutes: item.attendance.lateMinutes,
        source: "DUMMY",
      },
      create: {
        employeeId: employee.id,
        date,
        status: item.attendance.status,
        checkInAt: withTime(date, item.attendance.checkIn),
        lateMinutes: item.attendance.lateMinutes,
        source: "DUMMY",
      },
    });
  }

  const mainEmployee = await prisma.employee.findUnique({
    where: { nik: "202301087" },
  });

  if (mainEmployee) {
    employeeIds.push(mainEmployee.id);
  }

  const monthStart = new Date(today().getFullYear(), today().getMonth(), 1);
  const nextMonthStart = new Date(today().getFullYear(), today().getMonth() + 1, 1);
  const shiftPagi = shiftMap.get("Shift Pagi");
  const shiftLibur = shiftMap.get("Libur");

  if (shiftPagi && shiftLibur) {
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
      let date = new Date(monthStart);
      date < nextMonthStart;
      date.setDate(date.getDate() + 1)
    ) {
      const day = date.getDay();
      const isWeekend = day === 0 || day === 6;
      const shiftId = isWeekend ? shiftLibur.id : shiftPagi.id;

      for (const employeeId of employeeIds) {
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

  if (mainEmployee) {
    const historyStatuses = [
      "HADIR",
      "HADIR",
      "TERLAMBAT",
      "HADIR",
      "IZIN",
      "HADIR",
      "ALFA",
      "HADIR",
      "TERLAMBAT",
      "HADIR",
      "HADIR",
      "IZIN",
      "HADIR",
      "BELUM_ABSEN",
    ] as const;

    for (let index = 0; index < historyStatuses.length; index += 1) {
      const date = today();
      date.setDate(date.getDate() - (index + 1));

      const status = historyStatuses[index];
      const isLate = status === "TERLAMBAT";
      const hasCheckIn = status === "HADIR" || status === "TERLAMBAT";

      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: mainEmployee.id,
            date,
          },
        },
        update: {
          status,
          checkInAt: hasCheckIn ? withTime(date, isLate ? "07:20" : "06:55") : null,
          lateMinutes: isLate ? 20 : 0,
          source: "DUMMY",
        },
        create: {
          employeeId: mainEmployee.id,
          date,
          status,
          checkInAt: hasCheckIn ? withTime(date, isLate ? "07:20" : "06:55") : null,
          lateMinutes: isLate ? 20 : 0,
          source: "DUMMY",
        },
      });
    }
  }

  return {
    employees: dummyEmployees.length,
    schedulesForEmployees: employeeIds.length,
  };
};