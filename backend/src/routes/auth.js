const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const prisma = require("../lib/prisma");

const router = express.Router();
const verificationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    callback(allowed.includes(file.mimetype) ? null : new Error("Only PDF, JPG, and PNG documents are allowed"), allowed.includes(file.mimetype));
  },
}).single("verificationDocument");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is missing from .env");
}

// ==========================
// REGISTER
// ==========================
router.post("/register", (req, res, next) => verificationUpload(req, res, error => {
  if (error) return res.status(400).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "Verification documents must be 8 MB or smaller" : error.message });
  next();
}), async (req, res) => {
  try {
    if (!JWT_SECRET) return res.status(503).json({ success: false, message: "Sign-up is temporarily unavailable. Please try again later." });
    const { name, email, password, role, domain, bio } = req.body || {};

    if (![name, email, password, role].every(value => typeof value === "string" && value.trim())) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role.toUpperCase();
    if (normalizedRole === "SPECIALIST" && !req.file) return res.status(400).json({ success: false, message: "Specialists must upload a qualification or professional credential before registering." });
    if (name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ success: false, message: "Your name must contain between 2 and 100 characters." });
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ success: false, message: "Use at least 8 characters and no more than 72 bytes for your password." });
    if ((bio !== undefined && (typeof bio !== "string" || bio.length > 2000)) || (domain !== undefined && (typeof domain !== "string" || domain.length > 100))) return res.status(400).json({ success: false, message: "Please shorten your profile details." });

    // Users cannot register themselves as ADMIN
    if (!["LEARNER", "SPECIALIST"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration role",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    let verificationDocument = null;
    if (req.file) {
      const extension = req.file.mimetype === "application/pdf" ? "pdf" : req.file.mimetype === "image/png" ? "png" : "jpg";
      const filename = `verification-${randomUUID()}.${extension}`;
      const directory = path.join(__dirname, "../../uploads");
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, filename), req.file.buffer);
      verificationDocument = { path: `/uploads/${filename}`, filename, directory };
    }

    try {
      const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role: normalizedRole,
          ...(normalizedRole === "LEARNER" ? { learnerProfile: { create: {} } } : {}),
          bio: typeof bio === "string" && bio.trim() ? bio.trim() : null,
        },
      });

      // Create specialist profile automatically
      if (normalizedRole === "SPECIALIST") {
        await tx.specialist.create({
          data: {
            userId: createdUser.id,
            domain:
              typeof domain === "string" && domain.trim()
                ? domain.trim()
                : "General Guidance",
            verificationDocument: verificationDocument.path,
            verificationDocumentName: req.file.originalname,
            verificationDocumentType: req.file.mimetype,
            verificationSubmittedAt: new Date(),
          },
        });
      }

      return createdUser;
      });

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

      return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        bio: user.bio,
      },
      });
    } catch (error) {
      if (verificationDocument) await fs.unlink(path.join(verificationDocument.directory, verificationDocument.filename)).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "An account with this email already exists. Please sign in." });
    if (error.code === "ECONNREFUSED") return res.status(503).json({ success: false, message: "The database is unavailable. Start PostgreSQL and try again." });

    return res.status(500).json({
      success: false,
      message: "We couldn't create your account. Please try again shortly.",
    });
  }
});

// ==========================
// LOGIN
// ==========================
router.post("/login", async (req, res) => {
  try {
    if (!JWT_SECRET) return res.status(503).json({ success: false, message: "Sign-in is temporarily unavailable. Please try again later." });
    const { email, password } = req.body || {};

    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password || email.length > 254 || password.length > 1024) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The email or password is incorrect. Please try again.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "The email or password is incorrect. Please try again.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "We couldn't sign you in. Please try again shortly.",
    });
  }
});

// ==========================
// CHANGE PASSWORD
// ==========================
const { requireAuth } = require("../middleware/auth");

router.put("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string" || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }
    if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update password. Please try again." });
  }
});

module.exports = router;

