const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { defaultDomains } = require("../lib/initDefaults");

const router = express.Router();
router.use(requireAuth, requireRole("ADMIN"));

const specialistInclude = {
  user: { select: { id: true, name: true, email: true, image: true, bio: true, createdAt: true } },
  availability: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } },
};

// ==========================
// OVERVIEW
// ==========================
router.get("/overview", async (req, res) => {
  try {
    const [
      users,
      learners,
      specialists,
      pendingSpecialists,
      domains,
      posts,
      workshops,
      appointments,
      paymentsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "LEARNER" } }),
      prisma.user.count({ where: { role: "SPECIALIST" } }),
      prisma.specialist.count({ where: { verification: "PENDING" } }),
      prisma.domain.count(),
      prisma.post.count(),
      prisma.workshop.count(),
      prisma.appointment.count(),
      prisma.payment.count(),
    ]);

    const recentApplications = await prisma.specialist.findMany({
      where: { verification: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 6,
      include: specialistInclude,
    });

    return res.json({
      success: true,
      metrics: {
        users,
        learners,
        specialists,
        pendingSpecialists,
        domains: domains || defaultDomains.length,
        posts,
        workshops,
        appointments,
        payments: paymentsCount,
      },
      recentApplications,
    });
  } catch (error) {
    console.error("ADMIN OVERVIEW ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load admin overview" });
  }
});

// ==========================
// SPECIALISTS & VERIFICATION
// ==========================
router.get("/specialists", async (req, res) => {
  try {
    const status = String(req.query.status || "ALL").toUpperCase();
    const where = ["PENDING", "VERIFIED", "REJECTED"].includes(status) ? { verification: status } : {};
    const specialists = await prisma.specialist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: specialistInclude,
    });
    return res.json({ success: true, specialists });
  } catch (error) {
    console.error("ADMIN SPECIALISTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load specialist applications" });
  }
});

router.patch("/specialists/:id/verification", async (req, res) => {
  try {
    const decision = String(req.body.decision || "").toUpperCase();
    if (!["VERIFIED", "REJECTED"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Choose approve or reject" });
    }
    const existing = await prisma.specialist.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Specialist application not found" });
    }

    const specialist = await prisma.$transaction(async (tx) => {
      const updated = await tx.specialist.update({
        where: { id: existing.id },
        data: {
          verification: decision,
          verifiedAt: decision === "VERIFIED" ? new Date() : null,
          verificationNotes: req.body.notes?.trim() || null,
        },
        include: specialistInclude,
      });

      await tx.notification.create({
        data: {
          userId: existing.userId,
          title:
            decision === "VERIFIED"
              ? "Specialist account approved"
              : "Specialist application needs attention",
          message:
            decision === "VERIFIED"
              ? "Congratulations! Your professional profile is verified and can now appear to learners, publish posts, and create workshops."
              : req.body.notes?.trim() ||
                "Your verification application was not approved. Review your document and submit again.",
        },
      });
      return updated;
    });

    return res.json({
      success: true,
      message: decision === "VERIFIED" ? "Specialist approved" : "Application rejected",
      specialist,
    });
  } catch (error) {
    console.error("VERIFY SPECIALIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update verification" });
  }
});

// ==========================
// USERS
// ==========================
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        specialist: { select: { verification: true, domain: true } },
      },
    });
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load users" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.id === req.auth.userId) {
      return res.status(400).json({ success: false, message: "You cannot delete your own admin account" });
    }
    await prisma.user.delete({ where: { id: user.id } });
    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});

// ==========================
// DOMAINS MANAGEMENT
// ==========================
router.get("/domains", async (req, res) => {
  try {
    const domains = await prisma.domain.findMany({ orderBy: { name: "asc" } });
    return res.json({ success: true, domains });
  } catch (error) {
    console.error("ADMIN GET DOMAINS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load domains" });
  }
});

router.post("/domains", async (req, res) => {
  try {
    const { name, description, icon } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Domain name is required" });
    }
    const trimmed = name.trim();
    const existing = await prisma.domain.findUnique({ where: { name: trimmed } });
    if (existing) {
      return res.status(409).json({ success: false, message: "A domain with this name already exists" });
    }
    const domain = await prisma.domain.create({
      data: {
        name: trimmed,
        description: description?.trim() || null,
        icon: icon?.trim() || "sparkles",
      },
    });
    return res.status(201).json({ success: true, message: "Domain created successfully", domain });
  } catch (error) {
    console.error("CREATE DOMAIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to create domain" });
  }
});

router.patch("/domains/:id", async (req, res) => {
  try {
    const { name, description, icon } = req.body || {};
    const existing = await prisma.domain.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: "Domain not found" });

    const domain = await prisma.domain.update({
      where: { id: req.params.id },
      data: {
        ...(name && typeof name === "string" ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(icon !== undefined ? { icon: icon?.trim() || "sparkles" } : {}),
      },
    });
    return res.json({ success: true, message: "Domain updated successfully", domain });
  } catch (error) {
    console.error("UPDATE DOMAIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update domain" });
  }
});

router.delete("/domains/:id", async (req, res) => {
  try {
    const existing = await prisma.domain.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: "Domain not found" });

    await prisma.domain.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Domain deleted successfully" });
  } catch (error) {
    console.error("DELETE DOMAIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete domain" });
  }
});

// ==========================
// POSTS MANAGEMENT
// ==========================
router.get("/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            specialist: { select: { headline: true, domain: true, verification: true } },
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });
    return res.json({ success: true, posts });
  } catch (error) {
    console.error("ADMIN GET POSTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load posts" });
  }
});

router.delete("/posts/:id", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    await prisma.post.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("ADMIN DELETE POST ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete post" });
  }
});

// ==========================
// WORKSHOPS MANAGEMENT
// ==========================
router.get("/workshops", async (req, res) => {
  try {
    const workshops = await prisma.workshop.findMany({
      orderBy: { date: "desc" },
      include: {
        specialist: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });
    return res.json({ success: true, workshops });
  } catch (error) {
    console.error("ADMIN GET WORKSHOPS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load workshops" });
  }
});

router.delete("/workshops/:id", async (req, res) => {
  try {
    const workshop = await prisma.workshop.findUnique({ where: { id: req.params.id } });
    if (!workshop) return res.status(404).json({ success: false, message: "Workshop not found" });
    await prisma.workshop.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Workshop deleted successfully" });
  } catch (error) {
    console.error("ADMIN DELETE WORKSHOP ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete workshop" });
  }
});

// ==========================
// APPOINTMENTS MANAGEMENT
// ==========================
router.get("/appointments", async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { date: "desc" },
      include: {
        learner: { select: { id: true, name: true, email: true, image: true } },
        specialist: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    return res.json({ success: true, appointments });
  } catch (error) {
    console.error("ADMIN GET APPOINTMENTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load appointments" });
  }
});

router.patch("/appointments/:id", async (req, res) => {
  try {
    const { status } = req.body || {};
    const valid = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        learner: { select: { id: true, name: true, email: true } },
        specialist: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json({ success: true, message: "Appointment updated", appointment });
  } catch (error) {
    console.error("ADMIN UPDATE APPOINTMENT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update appointment" });
  }
});

// ==========================
// PAYMENTS MANAGEMENT
// ==========================
router.get("/payments", async (req, res) => {
  try {
    const [payments, registrations] = await Promise.all([
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.workshopRegistration.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          learner: { select: { id: true, name: true, email: true } },
          workshop: { select: { id: true, title: true, price: true, type: true } },
        },
      }),
    ]);
    return res.json({ success: true, payments, registrations });
  } catch (error) {
    console.error("ADMIN GET PAYMENTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load payments" });
  }
});

module.exports = router;
