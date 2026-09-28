const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole, requireVerifiedSpecialist } = require("../middleware/auth");

const router = express.Router();

// ==========================
// IMAGE STORAGE
// ==========================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ==========================
// CREATE WORKSHOP
// ==========================

router.post("/", requireAuth, requireRole("SPECIALIST"), requireVerifiedSpecialist, upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      price,
      date,
      meetingUrl,
    } = req.body;

    if (!title || !description || !date) {
      return res.status(400).json({
        success: false,
        message: "Specialist, title, description and date are required",
      });
    }

    if (!String(title).trim() || !String(description).trim() || !Number.isFinite(new Date(date).getTime()) || new Date(date).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: "Add a title, description, and a future start time." });
    }
    if (type === "PAID" && (!Number.isFinite(Number(price)) || Number(price) <= 0)) {
      return res.status(400).json({ success: false, message: "Enter a price greater than zero." });
    }
    if (meetingUrl && !/^https?:\/\//i.test(meetingUrl)) {
      return res.status(400).json({ success: false, message: "Enter a valid http or https meeting link." });
    }
    const specialistId = req.auth.userId;
    const specialist = await prisma.user.findUnique({
      where: { id: specialistId },
      include: { specialist: true },
    });

    if (!specialist || !specialist.specialist) {
      return res.status(404).json({
        success: false,
        message: "Specialist profile not found",
      });
    }

    if (specialist.specialist.verification !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message: "Your specialist account must be approved by the administrator before you can host workshops.",
      });
    }

    if (specialist.role !== "SPECIALIST") {
      return res.status(403).json({
        success: false,
        message: "Only specialists can create workshops",
      });
    }

    const image = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const workshop = await prisma.workshop.create({
      data: {
        specialistId,
        title,
        description,
        image,
        type: type === "PAID" ? "PAID" : "FREE",
        price: type === "PAID" && price
          ? Number(price)
          : null,
        date: new Date(date),
        meetingUrl: meetingUrl || null,
      },
      include: {
        specialist: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Workshop created successfully",
      workshop,
    });
  } catch (error) {
    console.error("CREATE WORKSHOP ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.code === "P2002" ? "A workshop with these details already exists." : error.message || "Failed to create workshop",
    });
  }
});

// ==========================
// GET WORKSHOPS
// ==========================

router.get("/mine", requireAuth, requireRole("SPECIALIST"), async (req, res) => {
  try {
    const workshops = await prisma.workshop.findMany({
      where: { specialistId: req.auth.userId },
      orderBy: { date: "asc" },
      include: {
        specialist: { select: { id: true, name: true, email: true, image: true } },
        registrations: {
          include: { learner: { select: { id: true, name: true, email: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return res.json({ success: true, workshops });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load your workshops" });
  }
});

router.get("/registered", requireAuth, requireRole("LEARNER"), async (req, res) => {
  try {
    const registrations = await prisma.workshopRegistration.findMany({
      where: { learnerId: req.auth.userId },
      include: {
        workshop: {
          include: {
            specialist: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const workshops = registrations
      .filter((registration) => registration.workshop)
      .map((registration) => ({
        ...registration.workshop,
        registration,
      }));

    return res.json({ success: true, workshops });
  } catch (error) {
    console.error("GET REGISTERED WORKSHOPS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load your workshop registrations" });
  }
});

router.get("/", async (req, res) => {
  try {
    const workshops = await prisma.workshop.findMany({
      orderBy: {
        date: "asc",
      },
      include: {
        specialist: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        registrations: {
          select: {
            id: true,
            learnerId: true,
            paymentMethod: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      workshops,
    });
  } catch (error) {
    console.error("GET WORKSHOPS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load workshops",
    });
  }
});

router.post("/:id/register", requireAuth, requireRole("LEARNER"), async (req, res) => {
  try {
    const { paymentMethod, phone } = req.body || {};
    const workshop = await prisma.workshop.findUnique({ where: { id: req.params.id } });

    if (!workshop) {
      return res.status(404).json({ success: false, message: "Workshop not found" });
    }

    const existingRegistration = await prisma.workshopRegistration.findUnique({
      where: { workshopId_learnerId: { workshopId: workshop.id, learnerId: req.auth.userId } },
    });

    if (existingRegistration) {
      return res.json({ success: true, message: "You are already registered for this workshop", registration: existingRegistration });
    }

    if (workshop.type === "PAID") {
      if (!phone || !/^\d+$/.test(phone)) {
        return res.status(400).json({ success: false, message: "A valid mobile money phone number is required." });
      }
      try {
        const { requestCollection } = require("../lib/campay");
        const reference = `ws_${workshop.id}_${req.auth.userId}_${Date.now()}`;
        await requestCollection(workshop.price, "XAF", phone, `Registration for ${workshop.title}`, reference);
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message || "Payment initiation failed." });
      }
    }
    if (new Date(workshop.date).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: "Registration for this workshop has closed." });
    }

    const registration = await prisma.workshopRegistration.upsert({
      where: { workshopId_learnerId: { workshopId: workshop.id, learnerId: req.auth.userId } },
      update: {},
      create: {
        workshopId: workshop.id,
        learnerId: req.auth.userId,
        paymentMethod: workshop.type === "PAID" ? String(paymentMethod || "MOMO").toUpperCase() : "FREE",
        paymentStatus: workshop.type === "PAID" ? "PENDING" : "COMPLETED",
        status: "REGISTERED",
      },
    });

    return res.status(201).json({ success: true, message: "Workshop registration successful", registration });
  } catch (error) {
    console.error("REGISTER WORKSHOP ERRROR:", error);
    return res.status(500).json({ success: false, message: "Failed to register for workshop" });
  }
});

router.get("/:id/registrations", requireAuth, requireRole("SPECIALIST"), async (req, res) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: req.params.id },
      include: {
        registrations: {
          include: { learner: { select: { id: true, name: true, email: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!workshop || workshop.specialistId !== req.auth.userId) {
      return res.status(404).json({ success: false, message: "Workshop not found" });
    }

    return res.json({ success: true, registrations: workshop.registrations });
  } catch (error) {
    console.error("GET WORKSHOP REGISTRATIONS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load workshop registrations" });
  }
});

router.patch("/:id", requireAuth, requireRole("SPECIALIST"), requireVerifiedSpecialist, upload.single("image"), async (req, res) => {
  try {
    const { title, description, date, type, price, meetingUrl } = req.body || {};
    const workshop = await prisma.workshop.findUnique({ where: { id: req.params.id } });

    if (!workshop || workshop.specialistId !== req.auth.userId) {
      return res.status(404).json({ success: false, message: "Workshop not found" });
    }

    if (typeof meetingUrl === "string" && meetingUrl && !/^https?:\/\//i.test(meetingUrl)) {
      return res.status(400).json({ success: false, message: "Enter a valid http or https meeting link." });
    }
    const nextType = type === undefined ? workshop.type : type;
    const nextPrice = nextType === "FREE" ? null : price === undefined ? workshop.price : Number(price);
    if (!["FREE", "PAID"].includes(nextType) || (nextType === "PAID" && (!Number.isFinite(nextPrice) || nextPrice <= 0))) {
      return res.status(400).json({ success: false, message: "Choose a valid admission type and a price greater than zero for paid workshops." });
    }
    if ((title !== undefined && !String(title).trim()) || (description !== undefined && !String(description).trim())) {
      return res.status(400).json({ success: false, message: "Title and description cannot be empty." });
    }
    if (date !== undefined && (!Number.isFinite(new Date(date).getTime()) || (new Date(date).getTime() !== new Date(workshop.date).getTime() && new Date(date).getTime() <= Date.now()))) {
      return res.status(400).json({ success: false, message: "Choose a valid future start time when rescheduling." });
    }
    const updatedWorkshop = await prisma.workshop.update({
      where: { id: workshop.id },
      data: {
        title: title === undefined ? workshop.title : String(title).trim(),
        description: description === undefined ? workshop.description : String(description).trim(),
        date: date ? new Date(date) : workshop.date,
        type: nextType,
        price: nextPrice,
        image: req.file ? `/uploads/${req.file.filename}` : req.body.removeImage === "true" ? null : workshop.image,
        meetingUrl: typeof meetingUrl === "string" ? meetingUrl : workshop.meetingUrl,
      },
      include: {
        specialist: { select: { id: true, name: true, email: true, image: true } },
        registrations: {
          include: { learner: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
    });

    return res.json({ success: true, message: "Workshop updated", workshop: updatedWorkshop });
  } catch (error) {
    console.error("UPDATE WORKSHOP ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update workshop" });
  }
});

router.delete("/:id", requireAuth, requireRole("SPECIALIST"), requireVerifiedSpecialist, async (req, res) => {
  try {
    const workshop = await prisma.workshop.findUnique({ where: { id: req.params.id } });
    if (!workshop || workshop.specialistId !== req.auth.userId) return res.status(404).json({ success: false, message: "Workshop not found" });
    await prisma.workshop.delete({ where: { id: workshop.id } });
    return res.json({ success: true, message: "Workshop removed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to remove workshop" });
  }
});

module.exports = router;
