/**
 * AI guidance chat routes — POST /api/ai/chat
 *
 * Security notes:
 *  - the learner is authenticated with the existing Learnova JWT (requireAuth),
 *  - GEMINI_API_KEY stays on the server and is never returned to the browser,
 *  - all input is validated/limited before it reaches Gemini,
 *  - the endpoints are read-only: the AI can never modify database records.
 */

const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  LIMITS,
  cleanText,
  cleanHistory,
  cleanLearnerContext,
  createRateLimiter,
} = require("../lib/validation");
const {
  getStoredLearnerProfile,
  buildLearnerProfile,
} = require("../services/learnerProfileService");
const {
  runGuidanceChat,
  AI_DISCLAIMER,
  DEFAULT_FOLLOW_UPS,
} = require("../services/aiGuidanceService");
const { GeminiError, isConfigured, MODEL_FALLBACKS } = require("../services/geminiService");

const router = express.Router();

const chatLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 12,
  message:
    "You are sending messages a little too quickly. Please wait a few seconds and try again.",
});

/* ------------------------------------------------------------------ *
 * GET /api/ai/health — configuration check (no secrets exposed)
 * ------------------------------------------------------------------ */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    provider: "google-gemini",
    configured: isConfigured(),
    models: MODEL_FALLBACKS,
    suggestedQuestions: DEFAULT_FOLLOW_UPS,
    disclaimer: AI_DISCLAIMER,
  });
});

/* ------------------------------------------------------------------ *
 * POST /api/ai/chat
 * ------------------------------------------------------------------ */
router.post("/chat", requireAuth, chatLimiter, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    /* 1. Validate the learner message ------------------------------- */
    const message = cleanText(body.message, LIMITS.message);

    if (!message) {
      return res.status(400).json({
        success: false,
        code: "INVALID_MESSAGE",
        message: "Please type a question before sending it to the AI assistant.",
      });
    }

    if (message.length < 2) {
      return res.status(400).json({
        success: false,
        code: "INVALID_MESSAGE",
        message: "Your message is too short. Please write a full question.",
      });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        code: "GEMINI_NOT_CONFIGURED",
        message:
          "The AI assistant is not configured yet. Add GEMINI_API_KEY to backend/.env and restart the server.",
      });
    }

    const history = cleanHistory(body.history);
    const clientContext = cleanLearnerContext(body.context);

    /* 2. Retrieve the learner's onboarding information -------------- */
    const storedProfile = await getStoredLearnerProfile(req.user.userId);

    if (!storedProfile || !storedProfile.user) {
      return res.status(404).json({
        success: false,
        code: "PROFILE_NOT_FOUND",
        message: "We could not find your learner profile. Please sign in again.",
      });
    }

    const profile = buildLearnerProfile({
      storedProfile,
      clientContext,
      userId: req.user.userId,
    });

    /* 3. Ask Gemini + search the Learnova database ------------------ */
    const result = await runGuidanceChat({ profile, message, history });

    /* 4. Answer + structured recommendations ------------------------ */
    return res.json({
      success: true,
      message: result.message,
      domain: result.domain,
      secondaryDomains: result.secondaryDomains,
      recommendations: result.recommendations,
      suggestedQuestions: result.suggestedQuestions,
      consultSpecialist: result.consultSpecialist,
      disclaimer: result.disclaimer,
      profile: {
        name: profile.name,
        firstName: profile.firstName,
        domains: profile.domains,
        interests: profile.interests,
        goal: profile.goal,
        onboardingCompleted: profile.onboardingCompleted,
      },
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      console.error("AI CHAT GEMINI ERROR:", error.code, error.message);

      return res.status(error.status || 502).json({
        success: false,
        code: error.code,
        retryable: Boolean(error.retryable),
        message: error.message,
      });
    }

    console.error("AI CHAT ERROR:", error);

    return res.status(500).json({
      success: false,
      code: "AI_CHAT_FAILED",
      message:
        "The AI assistant could not answer right now. Please try again in a moment.",
    });
  }
});

module.exports = router;
