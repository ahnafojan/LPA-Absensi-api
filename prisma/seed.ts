import { seedAuthUsers } from "./seed/auth.seed.js";
import { seedDummyEmployees } from "./seed/dummy-employee.seed.js";
import { seedIzin } from "./seed/izin.seed.js";
import { prisma } from "../src/utils/prisma.js";

const main = async () => {
  const users = await seedAuthUsers();
  const dummyEmployees = await seedDummyEmployees();
  const izin = await seedIzin();
  console.log("Seed auth users selesai:");

  for (const user of users) {
    console.log(
      `- ${user.role}: username=${user.username}, password=${user.password}, nik=${user.nik}`,
    );
  }
  console.log("Seed dummy karyawan selesai:");
  console.log(`- employees: ${dummyEmployees.employees}`);
  console.log(`- schedulesForEmployees: ${dummyEmployees.schedulesForEmployees}`);
  console.log(`- attendanceRows: ${dummyEmployees.attendanceRows}`);
  console.log(`- attendanceRange: ${dummyEmployees.attendanceFrom} sampai ${dummyEmployees.attendanceTo}`);
  console.log("Seed izin selesai:");
  console.log(`- izin: ${izin.izin}`);
};

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
