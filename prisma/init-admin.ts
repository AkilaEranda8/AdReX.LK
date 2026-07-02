import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@adrexlk.com" },
    update: {},
    create: {
      email: "admin@adrexlk.com",
      username: "admin",
      password: adminPassword,
      name: "System Admin",
      role: "ADMIN",
    },
  });

  console.log("Admin user ready: admin@adrexlk.com / admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
