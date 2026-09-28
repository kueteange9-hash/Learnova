const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Optional auth helper to attach user if logged in
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token && process.env.JWT_SECRET) {
    try {
      req.auth = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Ignore invalid token for public support submissions
    }
  }
  next();
}

// ==========================
// SUBMIT SUPPORT / FEEDBACK
// ==========================
router.post("/", optionalAuth, async (req, res) => {
  try {
    const { name, email, subject, message, category } = req.body || {};

    if (!subject || typeof subject !== "string" || !subject.trim() || !message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, message: "Subject and message are required" });
    }

    let userId = req.auth?.userId || null;
    let senderName = name?.trim() || "";
    let senderEmail = email?.trim() || "";

    if (userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      if (dbUser) {
        if (!senderName) senderName = dbUser.name;
        if (!senderEmail) senderEmail = dbUser.email;
      }
    }

    if (!senderEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      return res.status(400).json({ success: false, message: "A valid email address is required to reach you." });
    }

    const ticket = await prisma.supportFeedback.create({
      data: {
        userId,
        name: senderName || "Anonymous Learnova User",
        email: senderEmail.toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        category: typeof category === "string" && category.trim() ? category.trim() : "General",
        status: "OPEN",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Thank you for reaching out! Your support request / feedback has been received.",
      ticket,
    });
  } catch (error) {
    console.error("SUPPORT SUBMIT ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not submit support request. Please try again shortly." });
  }
});

// ==========================
// ADMIN: LIST ALL SUPPORT TICKETS
// ==========================
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const tickets = await prisma.supportFeedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, image: true } },
      },
    });
    return res.json({ success: true, tickets });
  } catch (error) {
    console.error("ADMIN SUPPORT TICKETS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load support tickets" });
  }
});

// ==========================
// ADMIN: UPDATE TICKET STATUS
// ==========================
router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid ticket status" });
    }

    const existing = await prisma.supportFeedback.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: "Support request not found" });

    const updated = await prisma.supportFeedback.update({
      where: { id: req.params.id },
      data: { status },
    });

    return res.json({ success: true, message: "Ticket updated", ticket: updated });
  } catch (error) {
    console.error("ADMIN UPDATE TICKET ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update support request" });
  }
});

module.exports = router;
