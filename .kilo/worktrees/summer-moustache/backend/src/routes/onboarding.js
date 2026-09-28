/**
 * Learner onboarding routes.
 *
 * The onboarding wizard already existed on the frontend (localStorage only).
 * These endpoints persist the same, non-sensitive information on the learner's
 * User row so the AI assistant can personalise its guidance from the database.
 *
 * POST /api/onboarding   → save / update the learner's onboarding answers
 * GET  /api/onboarding/me → read them back
 */

const express = require("express");

const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const {
  cleanOnboardingPayload,
  getStoredLearnerProfile,
} = require("../services/learnerProfileService");

const router = express.Router();

const ONBOARDING_SELECT = {
  onboardingCompleted: true,
  onboardingDomains: true,
  onboardingInterests: true,
  onboardingGoal: true,
  onboardingGuidance: true,
  onboardingCareer: true,
  onboardingEducation: true,
  onboardingCompletedAt: true,
};

function isMissingOnboardingColumns(error) {
  const message = String(error?.message || "");

  return (
    error?.code === "P2022" ||
    /Unknown arg|Unknown field|does not exist in the current database/i.test(message)
  );
}

function serializeOnboarding(user) {
  return {
    completed: Boolean(user.onboardingCompleted),
    domains: Array.isArray(user.onboardingDomains) ? user.onboardingDomains : [],
    interests: Array.isArray(user.onboardingInterests) ? user.onboardingInterests : [],
    goal: user.onboardingGoal || "",
    guidance: user.onboardingGuidance || "",
    career: user.onboardingCareer || "",
    education: user.onboardingEducation || "",
    completedAt: user.onboardingCompletedAt || null,
  };
}

/* ------------------------------------------------------------------ *
 * POST /api/onboarding
 * ------------------------------------------------------------------ */
router.post("/", requireAuth, async (req, res) => {
  try {
    const data = cleanOnboardingPayload(req.body || {});

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: { id: true, name: true, ...ONBOARDING_SELECT },
    });

    return res.json({
      success: true,
      message: "Your preferences have been saved.",
      onboarding: serializeOnboarding(user),
    });
  } catch (error) {
    if (isMissingOnboardingColumns(error)) {
      console.warn("ONBOARDING SAVE SKIPPED (migration not applied):", error?.message);

      return res.status(503).json({
        success: false,
        code: "MIGRATION_REQUIRED",
        message:
          "The onboarding columns are not in the database yet. Run `npx prisma migrate deploy` and `npx prisma generate` in the backend folder, then restart the server.",
      });
    }

    console.error("ONBOARDING SAVE ERROR:", error);

    return res.status(500).json({
      success: false,
      code: "ONBOARDING_SAVE_FAILED",
      message: "We could not save your onboarding information. Please try again.",
    });
  }
});

/* ------------------------------------------------------------------ *
 * GET /api/onboarding/me
 * ------------------------------------------------------------------ */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const stored = await getStoredLearnerProfile(req.user.userId);

    if (!stored || !stored.user) {
      return res.status(404).json({
        success: false,
        code: "PROFILE_NOT_FOUND",
        message: "We could not find your learner profile.",
      });
    }

    return res.json({
      success: true,
      stored: stored.onboardingStored,
      onboarding: serializeOnboarding(stored.user),
    });
  } catch (error) {
    console.error("ONBOARDING READ ERROR:", error);

    return res.status(500).json({
      success: false,
      code: "ONBOARDING_READ_FAILED",
      message: "We could not load your onboarding information.",
    });
  }
});

module.exports = router;
