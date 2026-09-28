const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");

const DEMO_PASSWORD = "LearnovaDemo2026!";
const learnerSeeds = [
  ["Amina Njoya", "amina.learner@learnova.test", "Career Guidance"],
  ["David Mensah", "david.learner@learnova.test", "Entrepreneurship"],
  ["Grace Toure", "grace.learner@learnova.test", "Academic Guidance"],
  ["Kevin Mbida", "kevin.learner@learnova.test", "Agriculture"],
  ["Mireille Kone", "mireille.learner@learnova.test", "Mental Wellbeing"],
  ["Samuel Fofana", "samuel.learner@learnova.test", "Personal Development"],
];
const specialistSeeds = [
  ["Dr. Nadia Okafor", "nadia.specialist@learnova.test", "Career Guidance", "Career strategist helping learners turn strengths into practical career plans."],
  ["Marcelle Biko", "marcelle.specialist@learnova.test", "Entrepreneurship", "Founder and business mentor focused on sustainable early-stage ventures."],
  ["Prof. Elias Nkem", "elias.specialist@learnova.test", "Academic Guidance", "Academic counsellor supporting study systems, scholarships, and university planning."],
  ["Josephine Tamba", "josephine.specialist@learnova.test", "Agriculture", "Agribusiness specialist helping young farmers build resilient income streams."],
  ["Dr. Awa Diallo", "awa.specialist@learnova.test", "Mental Wellbeing", "Wellbeing coach sharing practical tools for confidence, focus, and healthy routines."],
];
const domains = ["Career Guidance", "Entrepreneurship", "Academic Guidance", "Agriculture", "Mental Wellbeing", "Personal Development"];
const postTopics = [
  "A simple reflection exercise can reveal which kind of work gives you lasting energy.",
  "Start with the smallest useful version of your idea, then learn from real people using it.",
  "A weekly study review is more powerful than waiting for motivation before an exam.",
  "Strong communities and clear customer needs are the foundation of a resilient project.",
  "Progress is easier to sustain when your goals are specific, visible, and kind to your current capacity.",
  "Ask better questions, document what you learn, and let each conversation improve your next step.",
];
const workshopTopics = [
  "Build Your 90-Day Growth Plan",
  "From Idea to First Customer",
  "Study Systems That Actually Stick",
  "Practical Agribusiness Planning",
  "Confidence, Boundaries, and Wellbeing",
  "Finding Your Direction Without Rushing",
];

async function upsertUser({ name, email, role, bio }) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name, password, role, bio },
    create: { name, email, password, role, bio },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production.");

  const learners = [];
  for (const [name, email, domain] of learnerSeeds) {
    const user = await upsertUser({ name, email, role: "LEARNER", bio: `Learning about ${domain.toLowerCase()} with the Learnova community.` });
    await prisma.learnerProfile.upsert({
      where: { userId: user.id },
      update: { interests: [domain, "Personal Development"], goals: ["Build practical skills", "Meet helpful mentors"], formats: ["Video", "Chat"], stage: "Exploring", aspiration: `Grow confidently in ${domain.toLowerCase()}`, completedAt: new Date() },
      create: { userId: user.id, interests: [domain, "Personal Development"], goals: ["Build practical skills", "Meet helpful mentors"], formats: ["Video", "Chat"], stage: "Exploring", aspiration: `Grow confidently in ${domain.toLowerCase()}`, completedAt: new Date() },
    });
    learners.push(user);
  }

  const specialists = [];
  for (const [name, email, domain, bio] of specialistSeeds) {
    const user = await upsertUser({ name, email, role: "SPECIALIST", bio });
    const specialist = await prisma.specialist.upsert({
      where: { userId: user.id },
      update: { domain, headline: bio, qualification: "Verified Learnova demo specialist", experience: "8+ years supporting learners and early-stage professionals", howIHelp: bio, expertise: [domain, "Mentoring", "Goal setting"], expertiseDescriptions: [`Practical ${domain.toLowerCase()} guidance for learners at every stage.`], languages: ["English", "French"], sessionFormats: ["Video", "Chat"], sessionRate: 25, sessionDuration: 45, verification: "VERIFIED", verifiedAt: new Date() },
      create: { userId: user.id, domain, headline: bio, qualification: "Verified Learnova demo specialist", experience: "8+ years supporting learners and early-stage professionals", howIHelp: bio, expertise: [domain, "Mentoring", "Goal setting"], expertiseDescriptions: [`Practical ${domain.toLowerCase()} guidance for learners at every stage.`], languages: ["English", "French"], sessionFormats: ["Video", "Chat"], sessionRate: 25, sessionDuration: 45, verification: "VERIFIED", verifiedAt: new Date() },
    });
    specialists.push({ user, specialist });
  }

  const demoUserIds = [...learners.map(user => user.id), ...specialists.map(item => item.user.id)];
  await prisma.like.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.comment.deleteMany({ where: { authorId: { in: demoUserIds } } });
  await prisma.post.deleteMany({ where: { authorId: { in: specialists.map(item => item.user.id) } } });
  await prisma.workshopRegistration.deleteMany({ where: { learnerId: { in: learners.map(user => user.id) } } });
  await prisma.workshop.deleteMany({ where: { specialistId: { in: specialists.map(item => item.user.id) } } });
  await prisma.availabilitySlot.deleteMany({ where: { specialistId: { in: specialists.map(item => item.specialist.id) } } });
  await prisma.specialistFollow.deleteMany({ where: { learnerId: { in: learners.map(user => user.id) } } });

  const posts = [];
  for (let index = 0; index < 20; index += 1) {
    const specialist = specialists[index % specialists.length];
    const post = await prisma.post.create({ data: { authorId: specialist.user.id, domain: domains[index % domains.length], text: `${postTopics[index % postTopics.length]} ${specialist.user.name} shares one practical step for this week.`, shares: (index + 1) * 2 }, });
    posts.push(post);
  }

  const workshops = [];
  for (let index = 0; index < 10; index += 1) {
    const specialist = specialists[index % specialists.length];
    const date = new Date(Date.now() + (index + 2) * 86400000);
    date.setHours(16 + (index % 3), 0, 0, 0);
    const workshop = await prisma.workshop.create({ data: { specialistId: specialist.user.id, title: workshopTopics[index % workshopTopics.length], description: `A practical live session led by ${specialist.user.name}. Leave with a clear next step, useful resources, and time for questions.`, type: index % 3 === 0 ? "PAID" : "FREE", price: index % 3 === 0 ? 15 : null, date, meetingUrl: "https://meet.learnova.test/demo" }, });
    workshops.push(workshop);
  }

  for (let index = 0; index < specialists.length; index += 1) {
    const specialist = specialists[index];
    for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
      const startsAt = new Date(Date.now() + (slotIndex + index + 2) * 86400000);
      startsAt.setHours(10 + slotIndex * 2, 0, 0, 0);
      await prisma.availabilitySlot.create({ data: { specialistId: specialist.specialist.id, startsAt, endsAt: new Date(startsAt.getTime() + 45 * 60000) } });
    }
  }

  for (const learner of learners) {
    for (const specialist of specialists.slice(0, 3)) await prisma.specialistFollow.create({ data: { learnerId: learner.id, specialistId: specialist.user.id } });
    for (const workshop of workshops.slice(0, 3)) await prisma.workshopRegistration.create({ data: { workshopId: workshop.id, learnerId: learner.id, paymentMethod: workshop.type === "PAID" ? "MOMO" : null, paymentStatus: "COMPLETED" } });
    await prisma.notification.create({ data: { userId: learner.id, title: "Welcome to Learnova", message: "Explore new specialists and workshops selected for your growth." } });
  }

  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index];
    const learner = learners[index % learners.length];
    await prisma.like.create({ data: { userId: learner.id, postId: post.id } });
    await prisma.comment.create({ data: { postId: post.id, authorId: learner.id, text: "This is useful. I am adding it to my plan for this week." } });
  }

  console.log(`Seeded ${learners.length} learners, ${specialists.length} specialists, ${posts.length} posts, and ${workshops.length} workshops.`);
  console.log(`Shared demo password: ${DEMO_PASSWORD}`);
  console.log("Learner accounts:");
  learners.forEach(user => console.log(`- ${user.name} | ${user.email}`));
  console.log("Specialist accounts:");
  specialists.forEach(({ user }) => console.log(`- ${user.name} | ${user.email}`));
}

main().catch(error => { console.error("Could not seed demo data:", error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
