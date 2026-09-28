const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const includePeople = {
  learner: { select: { id: true, name: true, email: true, image: true } },
  specialist: { select: { id: true, name: true, email: true, image: true, specialist: { select: { headline: true, domain: true } } } },
  availabilitySlot: true,
};

router.get("/", async (req, res) => {
  try {
    const where = req.auth.role === "SPECIALIST" ? { specialistId: req.auth.userId } : { learnerId: req.auth.userId };
    const appointments = await prisma.appointment.findMany({ where, orderBy: { date: "asc" }, include: includePeople });
    return res.json({ success: true, appointments });
  } catch (error) {
    console.error("GET APPOINTMENTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load appointments" });
  }
});

router.post("/", async (req, res) => {
  if (req.auth.role !== "LEARNER") return res.status(403).json({ success: false, message: "Only learners can book appointments" });
  try {
    const { specialistId, slotId, requestedDate, notes, format } = req.body || {};
    if (typeof specialistId !== "string" || !specialistId) return res.status(400).json({ success: false, message: "Specialist is required" });
    if (slotId !== undefined && (typeof slotId !== "string" || !slotId)) return res.status(400).json({ success: false, message: "Appointment time is invalid" });
    if (notes !== undefined && (typeof notes !== "string" || notes.length > 5000)) return res.status(400).json({ success: false, message: "Session context must be text of at most 5000 characters" });
    const isFollowing = await prisma.specialistFollow.findUnique({
      where: { learnerId_specialistId: { learnerId: req.auth.userId, specialistId } },
    });
    if (!isFollowing) return res.status(403).json({ success: false, message: "Follow this specialist before booking an appointment." });
    const slot = slotId ? await prisma.availabilitySlot.findUnique({ where: { id: slotId }, include: { specialist: true } }) : null;
    if (slotId && !slot) return res.status(409).json({ success: false, message: "That appointment time is no longer available" });
    const specialist = slot?.specialist || await prisma.specialist.findUnique({ where: { userId: specialistId } });
    if (!specialist || specialist.userId !== specialistId) return res.status(404).json({ success: false, message: "Specialist not found" });
    if (specialist.verification !== "VERIFIED") return res.status(409).json({ success: false, message: "This specialist is not currently accepting bookings" });
    if (slot && (slot.booked || slot.startsAt <= new Date())) return res.status(409).json({ success: false, message: "That appointment time is no longer available" });
    if (!slot && (typeof requestedDate !== "string" || !requestedDate)) return res.status(400).json({ success: false, message: "Choose a preferred date and time" });
    const requestedDateValue = slot?.startsAt || new Date(requestedDate);
    if (Number.isNaN(requestedDateValue.getTime()) || requestedDateValue <= new Date()) return res.status(400).json({ success: false, message: "Choose a future appointment time" });
    const allowedFormats = specialist.sessionFormats.length ? specialist.sessionFormats : ["Video"];
    if (format !== undefined && !allowedFormats.includes(format)) return res.status(400).json({ success: false, message: "Choose a format offered by this specialist" });
    const selectedFormat = format || allowedFormats[0];
    const endDate = slot?.endsAt || new Date(requestedDateValue.getTime() + (specialist.sessionDuration || 45) * 60000);
    const appointment = await prisma.$transaction(async (tx) => {
      if (slot) {
        const locked = await tx.availabilitySlot.updateMany({ where: { id: slotId, booked: false }, data: { booked: true } });
        if (locked.count !== 1) throw new Error("SLOT_TAKEN");
      }
      const created = await tx.appointment.create({ data: { learnerId: req.auth.userId, specialistId, availabilitySlotId: slotId || null, date: requestedDateValue, endDate, notes: notes?.trim() || null, format: selectedFormat }, include: includePeople });
      await tx.notification.create({ data: { userId: specialistId, title: "New appointment request", message: `${created.learner.name} requested a session on ${requestedDateValue.toISOString()}.` } });
      return created;
    });
    return res.status(201).json({ success: true, message: "Appointment request sent", appointment });
  } catch (error) {
    if (error.message === "SLOT_TAKEN") return res.status(409).json({ success: false, message: "That appointment time was just booked" });
    console.error("CREATE APPOINTMENT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to book appointment" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment || ![appointment.learnerId, appointment.specialistId].includes(req.auth.userId)) return res.status(404).json({ success: false, message: "Appointment not found" });
    const body = req.body || {};
    const status = body.status === undefined ? appointment.status : String(body.status).toUpperCase();
    const isSpecialist = req.auth.userId === appointment.specialistId;
    const editsDetails = body.meetingUrl !== undefined || body.specialistNotes !== undefined;
    if (!body.status && !editsDetails) return res.status(400).json({ success: false, message: "No changes supplied" });
    if (isSpecialist && (editsDetails || ["CONFIRMED", "COMPLETED"].includes(status))) {
      const specialist = await prisma.specialist.findUnique({ where: { userId: req.auth.userId }, select: { verification: true } });
      if (!specialist || specialist.verification !== "VERIFIED") {
        return res.status(403).json({
          success: false,
          message: "You can access your dashboard, but appointment management is available after administrator verification.",
          verification: specialist?.verification || "PENDING",
        });
      }
    }
    if (body.status !== undefined && !["CONFIRMED", "CANCELLED", "COMPLETED"].includes(status)) return res.status(400).json({ success: false, message: "Invalid appointment status" });
    if (editsDetails && !isSpecialist) return res.status(403).json({ success: false, message: "Only the specialist can edit meeting details" });
    for (const field of ["meetingUrl", "specialistNotes"]) {
      if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > (field === "meetingUrl" ? 2048 : 5000))) return res.status(400).json({ success: false, message: "Invalid meeting details" });
    }
    const meetingUrl = body.meetingUrl === undefined ? appointment.meetingUrl : body.meetingUrl.trim() || null;
    const specialistNotes = body.specialistNotes === undefined ? appointment.specialistNotes : body.specialistNotes.trim() || null;
    if (meetingUrl && (editsDetails || status === "CONFIRMED")) {
      try {
        const url = new URL(meetingUrl);
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error();
      } catch { return res.status(400).json({ success: false, message: "Enter a valid http or https meeting link" }); }
    }
    if (["CONFIRMED", "COMPLETED"].includes(status) && req.auth.userId !== appointment.specialistId) return res.status(403).json({ success: false, message: "Only the specialist can set this status" });
    if (["CANCELLED", "COMPLETED"].includes(appointment.status)) return res.status(409).json({ success: false, message: "This appointment is already closed" });
    if (status === "COMPLETED" && (!["CONFIRMED", "APPROVED"].includes(appointment.status) || new Date(appointment.endDate || appointment.date) > new Date())) return res.status(409).json({ success: false, message: "Only confirmed sessions that have ended can be completed" });
    if (status === "CONFIRMED" && appointment.status === "PENDING" && appointment.date <= new Date()) return res.status(409).json({ success: false, message: "This request has expired. Please arrange a new time." });
    if (status === "CONFIRMED" && appointment.format === "Video" && !meetingUrl) return res.status(400).json({ success: false, message: "Add a meeting link before confirming a video session" });
    if (status === "CONFIRMED" && appointment.format === "In-person" && !specialistNotes) return res.status(400).json({ success: false, message: "Add the meeting location before confirming an in-person session" });
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.appointment.updateMany({ where: { id: appointment.id, status: appointment.status, updatedAt: appointment.updatedAt }, data: { status, availabilitySlotId: status === "CANCELLED" ? null : appointment.availabilitySlotId, meetingUrl, specialistNotes } });
      if (changed.count !== 1) throw new Error("APPOINTMENT_CHANGED");
      const result = await tx.appointment.findUnique({ where: { id: appointment.id }, include: includePeople });
      if (status === "CANCELLED" && appointment.availabilitySlotId) await tx.availabilitySlot.update({ where: { id: appointment.availabilitySlotId }, data: { booked: false } });
      const recipientId = req.auth.userId === appointment.specialistId ? appointment.learnerId : appointment.specialistId;
      await tx.notification.create({ data: { userId: recipientId, title: status === appointment.status ? "Meeting details updated" : `Appointment ${status.toLowerCase()}`, message: `Your appointment on ${appointment.date.toISOString()} ${status === appointment.status ? "has updated meeting details. Open your appointments to review them" : `is now ${status.toLowerCase()}`}.` } });
      return result;
    });
    return res.json({ success: true, appointment: updated });
  } catch (error) {
    if (error.message === "APPOINTMENT_CHANGED") return res.status(409).json({ success: false, message: "This appointment changed. Refresh and try again." });
    console.error("UPDATE APPOINTMENT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update appointment" });
  }
});

module.exports = router;
