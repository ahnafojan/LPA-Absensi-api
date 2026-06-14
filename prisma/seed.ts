import { seedAuthUsers } from "./seed/auth.seed.js";
import { prisma } from "../src/utils/prisma.js";

const main = async () => {
  const users = await seedAuthUsers();

  console.log("Seed auth users selesai:");

  for (const user of users) {
    console.log(
      `- ${user.role}: username=${user.username}, password=${user.password}, nik=${user.nik}`,
    );
  }
};

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
