import { prisma } from "../../src/utils/prisma.js";
import { hashPassword } from "../../src/utils/password.js";
import type { UserRole } from "../../src/types/auth.js";

type SeedAuthUser = {
  username: string;
  password: string;
  role: UserRole;
  namaLengkap: string;
  nik: string;
  divisi: string;
  jabatan: string;
};

const authUsers: SeedAuthUser[] = [
  {
    username: "hrd",
    password: "123",
    role: "HRD",
    namaLengkap: "Budi Santoso",
    nik: "202301088",
    divisi: "HR & Admin",
    jabatan: "HRD Staff",
  },
  {
    username: "karyawan",
    password: "123",
    role: "KARYAWAN",
    namaLengkap: "Andi Saputra",
    nik: "202301087",
    divisi: "Produksi - Line 4",
    jabatan: "Operator",
  },
];

export const seedAuthUsers = async () => {
  for (const item of authUsers) {
    const passwordHash = await hashPassword(item.password);

    await prisma.$transaction(async (tx) => {
      const division = await tx.division.upsert({
        where: { name: item.divisi },
        update: {},
        create: { name: item.divisi },
      });

      const existingPosition = await tx.position.findFirst({
        where: { name: item.jabatan },
      });

      const position =
        existingPosition ??
        (await tx.position.create({
          data: { name: item.jabatan },
        }));

      const employee = await tx.employee.upsert({
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

      await tx.user.upsert({
        where: { username: item.username },
        update: {
          passwordHash,
          role: item.role,
          employeeId: employee.id,
          isActive: true,
        },
        create: {
          username: item.username,
          passwordHash,
          role: item.role,
          employeeId: employee.id,
          isActive: true,
        },
      });
    });
  }

  return authUsers.map((user) => ({
    username: user.username,
    password: user.password,
    role: user.role,
    nik: user.nik,
  }));
};
