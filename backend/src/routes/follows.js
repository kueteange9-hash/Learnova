const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

router.use(requireAuth, requireRole("LEARNER"));

router.get("/", async (req, res) => {
  try {
    const follows = await prisma.specialistFollow.findMany({
      where: { learnerId: req.auth.userId },
      select: { specialistId: true },
    });
    return res.json({ specialistIds: follows.map(follow => follow.specialistId) });
  } catch {
    return res.status(500).json({ message: "Could not load followed specialists. Please try again." });
  }
});

router.put("/:specialistId", async (req, res) => {
  try {
    const specialistId = req.params.specialistId;
    const specialist = await prisma.user.findUnique({ where: { id: specialistId }, select: { role: true } });
    if (!specialist || specialist.role !== "SPECIALIST" || specialistId === req.auth.userId) {
      return res.status(404).json({ message: "Specialist not found." });
    }
    const learnerId = req.auth.userId;
    await prisma.specialistFollow.upsert({
      where: { learnerId_specialistId: { learnerId, specialistId } },
      create: { learnerId, specialistId }, update: {},
    });
    return res.json({ following: true });
  } catch {
    return res.status(500).json({ message: "Could not follow this specialist. Please try again." });
  }
});

router.delete("/:specialistId", async (req, res) => {
  try {
    await prisma.specialistFollow.deleteMany({ where: { learnerId: req.auth.userId, specialistId: req.params.specialistId } });
    return res.json({ following: false });
  } catch {
    return res.status(500).json({ message: "Could not unfollow this specialist. Please try again." });
  }
});

module.exports = router;
