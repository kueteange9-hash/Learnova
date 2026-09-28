const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");

async function main() {
  const [name, email, password, domain, bio] = process.argv.slice(2);

  if (!name || !email || !password || !domain || !bio) {
    console.log("Usage: node create-specialist.js <name> <email> <password> <domain> <bio>");
    console.log('Example: node scripts/create-specialist.js "Jane Doe" "jane@example.com" "password123" "Tech" "Senior software engineer."');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hashedPassword, role: "SPECIALIST", bio },
    create: { name, email, password: hashedPassword, role: "SPECIALIST", bio },
  });

  const specialist = await prisma.specialist.upsert({
    where: { userId: user.id },
    update: {
      domain,
      headline: bio,
      qualification: "Verified specialist",
      experience: "Professional experience",
      howIHelp: bio,
      expertise: [domain],
      expertiseDescriptions: [`Guidance in ${domain}`],
      languages: ["English"],
      sessionFormats: ["Video", "Chat"],
      sessionRate: 25,
      sessionDuration: 45,
      verification: "VERIFIED",
      verifiedAt: new Date()
    },
    create: {
      userId: user.id,
      domain,
      headline: bio,
      qualification: "Verified specialist",
      experience: "Professional experience",
      howIHelp: bio,
      expertise: [domain],
      expertiseDescriptions: [`Guidance in ${domain}`],
      languages: ["English"],
      sessionFormats: ["Video", "Chat"],
      sessionRate: 25,
      sessionDuration: 45,
      verification: "VERIFIED",
      verifiedAt: new Date()
    }
  });

  console.log("-----------------------------------------");
  console.log("Specialist successfully created/updated!");
  console.log("Name:", user.name);
  console.log("Email:", user.email);
  console.log("Domain:", specialist.domain);
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
