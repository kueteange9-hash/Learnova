const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({ where: { userId: req.auth.userId }, orderBy: { createdAt: "desc" } });
    return res.json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load notifications" });
  }
});

router.patch("/read", async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.auth.userId, read: false }, data: { read: true } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update notifications" });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const updated = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.auth.userId }, data: { read: true } });
    if (!updated.count) return res.status(404).json({ success: false, message: "Notification not found" });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update notification" });
  }
});

module.exports = router;
