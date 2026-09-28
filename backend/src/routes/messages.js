const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
const person = { id: true, name: true, image: true, role: true };
const pair = (me, other) => ({ OR: [{ senderId: me, recipientId: other }, { senderId: other, recipientId: me }] });

router.use(requireAuth);
router.use((req, res, next) => ["LEARNER", "SPECIALIST"].includes(req.auth.role)
  ? next() : res.status(403).json({ message: "Learner or specialist access required" }));

// Expose contacts the caller can message or has communicated with
router.get("/contacts", async (req, res) => {
  try {
    const me = req.auth.userId;
    const learner = req.auth.role === "LEARNER";
    const requestedContactId = typeof req.query.contact === "string" ? req.query.contact : null;

    const whereConditions = [
      ...(learner ? [{ followers: { some: { learnerId: me } } }] : [{ following: { some: { specialistId: me } } }]),
      learner ? { appointmentsAsSpecialist: { some: { learnerId: me } } } : { appointmentsAsLearner: { some: { specialistId: me } } },
      { sentMessages: { some: { recipientId: me } } },
      { receivedMessages: { some: { senderId: me } } },
    ];

    if (requestedContactId) {
      whereConditions.push({ id: requestedContactId });
    }

    if (learner) {
      // Learners can see verified specialists
      whereConditions.push({ specialist: { verification: "VERIFIED" } });
    }

    const contacts = await prisma.user.findMany({
      where: {
        role: learner ? "SPECIALIST" : "LEARNER",
        OR: whereConditions,
      },
      select: {
        ...person,
        sentMessages: { where: { recipientId: me }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
        receivedMessages: { where: { senderId: me }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
        _count: { select: { sentMessages: { where: { recipientId: me, read: false } } } },
      },
    });

    res.json({
      contacts: contacts.map(({ sentMessages, receivedMessages, _count, ...user }) => ({
        ...user,
        unread: _count.sentMessages,
        lastMessage: [...sentMessages, ...receivedMessages].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))[0] || null,
      })).sort((a, b) => (b.lastMessage?.createdAt?.getTime() || 0) - (a.lastMessage?.createdAt?.getTime() || 0) || a.name.localeCompare(b.name)),
    });
  } catch (error) {
    console.error("CHAT CONTACTS:", error);
    res.status(500).json({ message: "Could not load conversations" });
  }
});

router.use("/:userId", async (req, res, next) => {
  try {
    const me = req.auth.userId;
    const other = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { ...person, specialist: { select: { verification: true } } },
    });
    if (!other || other.role !== (req.auth.role === "LEARNER" ? "SPECIALIST" : "LEARNER")) {
      return res.status(404).json({ message: "Contact not found" });
    }

    req.contact = other;
    next();
  } catch (error) {
    console.error("CHAT ACCESS:", error);
    res.status(500).json({ message: "Could not open conversation" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const where = pair(req.auth.userId, req.contact.id);
    const before = req.query.before;
    if (before !== undefined) {
      if (typeof before !== "string") return res.status(400).json({ message: "Invalid message cursor" });
      const cursor = await prisma.message.findFirst({ where: { ...where, id: before } });
      if (!cursor) return res.status(400).json({ message: "Invalid message cursor" });
      where.AND = [{ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }];
    }
    const messages = await prisma.message.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51 });
    const hasMore = messages.length > 50;
    res.json({ messages: messages.slice(0, 50).reverse(), hasMore });
  } catch (error) {
    console.error("CHAT HISTORY:", error);
    res.status(500).json({ message: "Could not load messages" });
  }
});

router.post("/:userId", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 4000) return res.status(400).json({ message: "Messages must contain between 1 and 4,000 characters" });
  try {
    const message = await prisma.message.create({
      data: {
        senderId: req.auth.userId,
        recipientId: req.contact.id,
        text,
      },
    });
    res.status(201).json({ message });
  } catch (error) {
    console.error("CHAT SEND:", error);
    res.status(500).json({ message: "Could not send message. Please try again." });
  }
});

router.patch("/:userId/read", async (req, res) => {
  if (!Array.isArray(req.body?.ids) || req.body.ids.length > 50 || req.body.ids.some(id => typeof id !== "string")) {
    return res.status(400).json({ message: "Invalid message IDs" });
  }
  try {
    await prisma.message.updateMany({
      where: { id: { in: req.body.ids }, senderId: req.contact.id, recipientId: req.auth.userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("CHAT READ:", error);
    res.status(500).json({ message: "Could not mark messages as read" });
  }
});

module.exports = router;
