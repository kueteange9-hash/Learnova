/**
 * Authentication middleware.
 *
 * Learnova already authenticates users in `routes/auth.js` by issuing a JWT
 * (signed with JWT_SECRET, payload { userId, role }). This middleware reuses
 * that exact token so the AI endpoints stay on the existing authentication
 * system — no second auth system, no duplicated user model.
 */

const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is missing from .env (AI routes require it)");
}

function readBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;

  if (!header || typeof header !== "string") return null;

  const [scheme, token] = header.split(" ");

  if (!token || scheme.toLowerCase() !== "bearer") return null;

  return token.trim();
}

function unauthorized(res, message = "You must be signed in to use the AI assistant.") {
  return res.status(401).json({
    success: false,
    code: "AUTH_REQUIRED",
    message,
  });
}

/**
 * Require a valid Learnova JWT and load the matching user from the database.
 * Attaches `req.user = { userId, role, name, email }`.
 */
async function requireAuth(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(503).json({
      success: false,
      code: "SERVER_MISCONFIGURED",
      message: "Authentication is not configured on the server (JWT_SECRET missing).",
    });
  }

  const token = readBearerToken(req);

  if (!token) {
    return unauthorized(res);
  }

  let payload;

  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return unauthorized(res, "Your session has expired. Please sign in again.");
  }

  if (!payload || !payload.userId) {
    return unauthorized(res);
  }

  try {
    // The token must belong to an account that still exists.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return unauthorized(res, "Your account could not be found. Please sign in again.");
    }

    req.user = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      tokenRole: payload.role || null,
    };

    return next();
  } catch (error) {
    console.error("AUTH LOOKUP ERROR:", error);

    return res.status(500).json({
      success: false,
      code: "AUTH_LOOKUP_FAILED",
      message: "We could not verify your account right now. Please try again.",
    });
  }
}

module.exports = { requireAuth, readBearerToken, JWT_SECRET };
