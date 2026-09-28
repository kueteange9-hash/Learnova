const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const uploadPhoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }).single("photo");

router.post("/me/photo", requireAuth, requireRole("SPECIALIST"), (req, res) => {
  uploadPhoto(req, res, async (error) => {
    if (error) return res.status(400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Profile photos must be 2 MB or smaller" : "Could not read profile photo" });
    const file = req.file;
    const png = file?.mimetype === "image/png" && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpg = file?.mimetype === "image/jpeg" && file.buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    if (!png && !jpg) return res.status(400).json({ message: "Choose a JPG or PNG profile photo" });
    const filename = `profile-${req.auth.userId}-${randomUUID()}.${png ? "png" : "jpg"}`;
    const directory = path.join(__dirname, "../../uploads");
    const destination = path.join(directory, filename);
    try {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(destination, file.buffer);
      const user = await prisma.user.update({ where: { id: req.auth.userId }, data: { image: `/uploads/${filename}` }, select: userSelect });
      return res.json({ success: true, user });
    } catch (caught) {
      await fs.unlink(destination).catch(() => {});
      return res.status(500).json({ message: "Could not save profile photo" });
    }
  });
});
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../uploads")),
  filename: (req, file, cb) => cb(null, `verification-${req.auth.userId}-${Date.now()}${path.extname(file.originalname)}`),
});
const uploadDocument = multer({ storage: documentStorage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  cb(allowed.includes(file.mimetype) ? null : new Error("Only PDF, JPG, and PNG documents are allowed"), allowed.includes(file.mimetype));
} });
const userSelect = { id: true, name: true, email: true, image: true, bio: true };

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].slice(0, 12);
}

router.get("/", async (req, res) => {
  try {
    const domain = typeof req.query.domain === "string" ? req.query.domain : undefined;
    const specialists = await prisma.specialist.findMany({
      where: { verification: "VERIFIED", ...(domain ? { domain } : {}) },
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: userSelect },
        availability: { where: { booked: false, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 3 },
      },
    });
    const sessionCounts = await Promise.all(specialists.map((profile) => prisma.appointment.count({ where: { specialistId: profile.userId, status: "COMPLETED" } })));
    return res.json({ success: true, specialists: specialists.map((profile, index) => ({ ...profile, completedSessions: sessionCounts[index] })) });
  } catch (error) {
    console.error("GET SPECIALISTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load specialists" });
  }
});

router.get("/me", requireAuth, requireRole("SPECIALIST"), async (req, res) => {
  try {
    const specialist = await prisma.specialist.findUnique({
      where: { userId: req.auth.userId },
      include: { user: { select: userSelect }, availability: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } } },
    });
    if (!specialist) return res.status(404).json({ success: false, message: "Specialist profile not found" });
    return res.json({ success: true, specialist });
  } catch (error) {
    console.error("GET SPECIALIST PROFILE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load your profile" });
  }
});

router.patch("/me", requireAuth, requireRole("SPECIALIST"), async (req, res) => {
  try {
    const { name, image, bio, domain, headline, qualification, experience, howIHelp, expertise, expertiseDescriptions, languages, sessionFormats, sessionRate, sessionDuration } = req.body;
    if (!name?.trim() || !domain?.trim() || !headline?.trim()) return res.status(400).json({ success: false, message: "Name, specialty, and professional headline are required" });
    const rate = Number(sessionRate);
    const duration = Number(sessionDuration);
    if (!Number.isFinite(rate) || rate < 0) return res.status(400).json({ success: false, message: "Enter a valid session rate" });
    if (![30, 45, 60, 90].includes(duration)) return res.status(400).json({ success: false, message: "Choose a supported session duration" });

    const [, specialist] = await prisma.$transaction([
      prisma.user.update({ where: { id: req.auth.userId }, data: { name: name.trim(), image: image || null, bio: bio?.trim() || null } }),
      prisma.specialist.update({ where: { userId: req.auth.userId }, data: {
        domain: domain.trim(), headline: headline.trim(), qualification: qualification?.trim() || null,
        experience: experience?.trim() || null, howIHelp: howIHelp?.trim() || null,
        expertise: cleanList(expertise), expertiseDescriptions: Array.isArray(expertiseDescriptions) ? expertiseDescriptions.map((item) => String(item).trim()).slice(0, 12) : [], languages: cleanList(languages), sessionFormats: cleanList(sessionFormats),
        sessionRate: rate, sessionDuration: duration,
      }, include: { user: { select: userSelect }, availability: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } } } }),
    ]);
    return res.json({ success: true, message: "Profile updated", specialist });
  } catch (error) {
    console.error("UPDATE SPECIALIST PROFILE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update your profile" });
  }
});

router.post("/me/verification-document", requireAuth, requireRole("SPECIALIST"), uploadDocument.single("document"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a verification document" });
    const specialist = await prisma.specialist.update({ where: { userId: req.auth.userId }, data: {
      verificationDocument: `/uploads/${req.file.filename}`,
      verificationDocumentName: req.file.originalname,
      verificationDocumentType: req.file.mimetype,
      verificationSubmittedAt: new Date(),
      verification: "PENDING",
      verificationNotes: null,
      verifiedAt: null,
    } });
    return res.json({ success: true, message: "Verification document submitted", specialist });
  } catch (error) {
    console.error("UPLOAD VERIFICATION DOCUMENT ERROR:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to upload verification document" });
  }
});

router.post("/me/availability", requireAuth, requireRole("SPECIALIST"), async (req, res) => {
  try {
    const startsAt = new Date(req.body.startsAt);
    const endsAt = new Date(req.body.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt <= new Date() || endsAt <= startsAt) return res.status(400).json({ success: false, message: "Choose a valid future time range" });
    const profile = await prisma.specialist.findUnique({ where: { userId: req.auth.userId } });
    if (!profile) return res.status(404).json({ success: false, message: "Specialist profile not found" });
    if (profile.verification !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message: "Your specialist account must be approved by the administrator before you can publish availability.",
      });
    }
    const overlap = await prisma.availabilitySlot.findFirst({ where: { specialistId: profile.id, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (overlap) return res.status(409).json({ success: false, message: "This time overlaps another availability slot" });
    const slot = await prisma.availabilitySlot.create({ data: { specialistId: profile.id, startsAt, endsAt } });
    return res.status(201).json({ success: true, slot });
  } catch (error) {
    console.error("CREATE AVAILABILITY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to add availability" });
  }
});

router.delete("/me/availability/:id", requireAuth, requireRole("SPECIALIST"), async (req, res) => {
  try {
    const slot = await prisma.availabilitySlot.findUnique({ where: { id: req.params.id }, include: { specialist: true } });
    if (!slot || slot.specialist.userId !== req.auth.userId) return res.status(404).json({ success: false, message: "Availability slot not found" });
    if (slot.booked) return res.status(409).json({ success: false, message: "A booked slot cannot be removed; cancel the appointment first" });
    await prisma.availabilitySlot.delete({ where: { id: slot.id } });
    return res.json({ success: true, message: "Availability removed" });
  } catch (error) {
    console.error("DELETE AVAILABILITY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to remove availability" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const specialist = await prisma.specialist.findFirst({
      where: { userId: req.params.userId, verification: "VERIFIED" },
      include: { user: { select: userSelect }, availability: { where: { booked: false, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } } },
    });
    if (!specialist) return res.status(404).json({ success: false, message: "Specialist not found" });
    const completedSessions = await prisma.appointment.count({ where: { specialistId: specialist.userId, status: "COMPLETED" } });
    return res.json({ success: true, specialist: { ...specialist, completedSessions } });
  } catch (error) {
    console.error("GET SPECIALIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load specialist" });
  }
});

router.patch("/me/dismiss-approval", requireAuth, requireRole("SPECIALIST"), async (req, res) => {
  try {
    const specialist = await prisma.specialist.update({
      where: { userId: req.auth.userId },
      data: { approvalDismissed: true },
    });
    return res.json({ success: true, message: "Approval notification dismissed", specialist });
  } catch (error) {
    console.error("DISMISS APPROVAL ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not dismiss approval notification" });
  }
});

module.exports = router;

