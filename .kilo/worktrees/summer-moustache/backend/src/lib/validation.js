/**
 * Small, dependency-free input validation helpers for the AI chat API.
 *
 * Everything that reaches Gemini (or the database) is cleaned here first:
 * no control characters, no unbounded strings, no huge payloads.
 */

const LIMITS = {
  message: 1200,
  historyItems: 10,
  historyItem: 2000,
  contextField: 160,
  contextList: 10,
  contextListItem: 60,
};

/**
 * Trim + strip control characters + hard length cap.
 */
function cleanText(value, max = LIMITS.contextField) {
  if (typeof value !== "string") return "";

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/**
 * Clean an array of short strings (domains, interests, ...).
 */
function cleanStringList(value, { max = LIMITS.contextList, itemMax = LIMITS.contextListItem } = {}) {
  let items = [];

  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === "string") {
    items = value.split(",");
  } else {
    return [];
  }

  const cleaned = items
    .map((item) => cleanText(item, itemMax))
    .filter(Boolean);

  return Array.from(new Set(cleaned)).slice(0, max);
}

/**
 * Validate the client conversation history: [{ role, content }].
 * Only "user" and "assistant" messages are accepted.
 */
function cleanHistory(value, { max = LIMITS.historyItems } = {}) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const role = entry.role === "assistant" ? "assistant" : "user";
      const content = cleanText(entry.content, LIMITS.historyItem);

      return { role, content };
    })
    .filter((entry) => entry.content.length > 0)
    .slice(-max);
}

/**
 * Validate the optional, non-sensitive learner context coming from the
 * browser (used to enrich the DB profile, never as a replacement for it).
 */
function cleanLearnerContext(value) {
  if (!value || typeof value !== "object") return {};

  return {
    name: cleanText(value.name, 80) || null,
    domains: cleanStringList(value.domains),
    interests: cleanStringList(value.interests),
    goal: cleanText(value.goal, LIMITS.contextField) || null,
    guidance: cleanText(value.guidance, LIMITS.contextField) || null,
    career: cleanText(value.career, LIMITS.contextField) || null,
    education: cleanText(value.education, LIMITS.contextField) || null,
  };
}

/**
 * Tiny in-memory rate limiter so a single account cannot burn the Gemini
 * quota (and to keep the endpoint responsive for everyone else).
 */
function createRateLimiter({ windowMs = 60_000, max = 15, message } = {}) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const key = String((req.user && req.user.userId) || req.ip || "anonymous");
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

      res.set("Retry-After", String(retryAfter));

      return res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message:
          message ||
          `You are sending messages too quickly. Please wait ${retryAfter} second(s) and try again.`,
      });
    }

    return next();
  };
}

module.exports = {
  LIMITS,
  cleanText,
  cleanStringList,
  cleanHistory,
  cleanLearnerContext,
  createRateLimiter,
};
