const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../lib/prisma");

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
    fileSize: 5 * 1024 * 1024,
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

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      specialistId,
      title,
      description,
      type,
      price,
      date,
    } = req.body;

    if (!specialistId || !title || !description || !date) {
      return res.status(400).json({
        success: false,
        message: "Specialist, title, description and date are required",
      });
    }

    const specialist = await prisma.user.findUnique({
      where: {
        id: specialistId,
      },
    });

    if (!specialist) {
      return res.status(404).json({
        success: false,
        message: "Specialist not found",
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
      message: "Failed to create workshop",
    });
  }
});

// ==========================
// GET WORKSHOPS
// ==========================

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

// ==========================
// GET ONE WORKSHOP
// (used by the AI recommendation "View Workshop" page)
// ==========================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const workshop = await prisma.workshop.findUnique({
      where: {
        id,
      },
      include: {
        specialist: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            specialist: {
              select: {
                domain: true,
                qualification: true,
                experience: true,
                verification: true,
              },
            },
          },
        },
      },
    });

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: "Workshop not found",
      });
    }

    res.json({
      success: true,
      workshop: {
        id: workshop.id,
        title: workshop.title,
        description: workshop.description,
        image: workshop.image,
        type: workshop.type,
        price: workshop.price,
        date: workshop.date,
        createdAt: workshop.createdAt,
        domain: workshop.specialist?.specialist?.domain || "General Guidance",
        specialist: {
          id: workshop.specialist.id,
          name: workshop.specialist.name,
          image: workshop.specialist.image,
          bio: workshop.specialist.bio,
          domain: workshop.specialist.specialist?.domain || "General Guidance",
          specialization:
            workshop.specialist.specialist?.qualification ||
            workshop.specialist.specialist?.experience ||
            null,
        },
      },
    });
  } catch (error) {
    console.error("GET WORKSHOP ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load this workshop",
    });
  }
});

module.exports = router;