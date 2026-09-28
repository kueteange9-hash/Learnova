const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");

const name = process.env.ADMIN_NAME?.trim() || "Administrator";
const email = (process.env.ADMIN_EMAIL || "admin@admin.com")
  .trim()
  .toLowerCase();
const password = process.env.ADMIN_PASSWORD || "Creolink";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create a test admin in production.");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const existingUser = await prisma.user.findUnique({ where: { email } });

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  console.log(existingUser ? "Test admin updated:" : "Test admin created:");
  console.log(admin);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error("Could not create test admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
