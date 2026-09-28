const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const bcrypt = require("bcryptjs");
const prisma = require("./prisma");

const defaultDomains = [
  {
    name: "Career Guidance & Planning",
    description: "Career exploration, resume building, interview preparation, and vocational transition strategies.",
    icon: "briefcase",
  },
  {
    name: "Academic & Educational Counselling",
    description: "Study skills, academic planning, exam preparation, and university/scholarship pathways.",
    icon: "book",
  },
  {
    name: "Mental Wellbeing & Stress Management",
    description: "Stress reduction, emotional resilience, burnout recovery, and work-life balance guidance.",
    icon: "heart",
  },
  {
    name: "Personal Development & Life Coaching",
    description: "Self-discovery, goal setting, time management, mindset growth, and habit formation.",
    icon: "sparkles",
  },
  {
    name: "Entrepreneurship & Business Mentoring",
    description: "Startup validation, business modelling, pitching, and early-stage venture strategy.",
    icon: "bulb",
  },
  {
    name: "Agribusiness & Rural Development",
    description: "Sustainable farming, agricultural value-chain management, and agribusiness economics.",
    icon: "leaf",
  },
  {
    name: "Technology & Digital Skills",
    description: "Software engineering, digital transformation, cloud skills, and tech career roadmaps.",
    icon: "cpu",
  },
  {
    name: "Financial Literacy & Money Management",
    description: "Budgeting, personal financial planning, investment basics, and debt management.",
    icon: "wallet",
  },
  {
    name: "Family & Relationship Counselling",
    description: "Interpersonal communication, conflict resolution, parenting, and family harmony.",
    icon: "users",
  },
  {
    name: "Leadership & Executive Mentoring",
    description: "Team leadership, strategic decision-making, executive communication, and team management.",
    icon: "target",
  },
  {
    name: "Health, Nutrition & Wellness",
    description: "Healthy lifestyle habits, holistic nutrition, energy management, and physical vitality.",
    icon: "activity",
  },
  {
    name: "Youth Mentorship & Peer Counselling",
    description: "Youth empowerment, peer support, social skills, and self-confidence building for students.",
    icon: "award",
  },
];

async function initDefaults() {
  try {
    // 1. Ensure Predefined Admin Account (admin@admin.com / Creolink)
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@admin.com").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "Creolink";
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: "Learnova Administrator",
        password: hashedPassword,
        role: "ADMIN",
      },
      create: {
        name: "Learnova Administrator",
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.log(`[Learnova] Predefined admin account verified: ${adminEmail}`);

    // 2. Ensure at least 12 Domains exist in database
    for (const d of defaultDomains) {
      await prisma.domain.upsert({
        where: { name: d.name },
        update: {
          description: d.description,
          icon: d.icon,
        },
        create: {
          name: d.name,
          description: d.description,
          icon: d.icon,
        },
      });
    }
    console.log(`[Learnova] Default guidance and counselling domains initialized (${defaultDomains.length} domains).`);
  } catch (error) {
    console.error("[Learnova] Error during initDefaults:", error.message);
  }
}

module.exports = { initDefaults, defaultDomains };
