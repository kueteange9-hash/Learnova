const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Your session is invalid or expired" });
  }
}

function requireRole(role) {
  return (req, res, next) => req.auth?.role === role
    ? next()
    : res.status(403).json({ success: false, message: `${role.toLowerCase()} access required` });
}

async function requireVerifiedSpecialist(req, res, next) {
  if (req.auth?.role !== "SPECIALIST") {
    return res.status(403).json({ success: false, message: "Specialist access required" });
  }
  try {
    const specialist = await prisma.specialist.findUnique({
      where: { userId: req.auth.userId },
      select: { verification: true },
    });
    if (!specialist) return res.status(404).json({ success: false, message: "Specialist profile not found" });
    if (specialist.verification !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message: "This action is available after an administrator verifies your specialist credentials.",
        verification: specialist.verification,
      });
    }
    return next();
  } catch (error) {
    console.error("VERIFY SPECIALIST ACCESS ERROR:", error);
    return res.status(500).json({ success: false, message: "Could not verify specialist access" });
  }
}

module.exports = { requireAuth, requireRole, requireVerifiedSpecialist };
