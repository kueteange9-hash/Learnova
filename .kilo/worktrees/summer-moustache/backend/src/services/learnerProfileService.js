/**
 * Learner profile service.
 *
 * The AI chat personalises its answers with:
 *   1. the onboarding information stored on the learner's User row
 *      (see prisma/schema.prisma → onboarding* fields), and
 *   2. a small, optional, non-sensitive context sent by the browser
 *      (localStorage onboarding of an account that has not been linked yet).
 *
 * The database is always the source of truth for identity: the browser
 * context can only *add* information, never override the authenticated user.
 */

const prisma = require("../lib/prisma");
const { cleanStringList, cleanText } = require("../lib/validation");
const { normalizeDomain, domainsFromProfile } = require("../lib/domains");

const BASE_SELECT = {
  id: true,
  name: true,
  role: true,
  bio: true,
  image: true,
};

/**
 * Only present once the `add_learner_onboarding` migration has been applied.
 */
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

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Read the learner's row from PostgreSQL.
 * Falls back to the base columns when the onboarding migration has not been
 * applied yet, so the AI chat keeps working instead of crashing.
 */
async function getStoredLearnerProfile(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...BASE_SELECT, ...ONBOARDING_SELECT },
    });

    if (!user) return null;

    return { user, onboardingStored: true };
  } catch (error) {
    console.warn(
      "ONBOARDING COLUMNS UNAVAILABLE (run `npx prisma migrate deploy` + `npx prisma generate`):",
      error?.message
    );

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: BASE_SELECT,
    });

    return user ? { user, onboardingStored: false } : null;
  }
}

/**
 * Merge the database profile with the optional browser context.
 */
function buildLearnerProfile({ storedProfile, clientContext = {}, userId }) {
  const user = storedProfile?.user || {};

  const dbDomains = cleanStringList(
    Array.isArray(user.onboardingDomains) ? user.onboardingDomains : []
  );

  const dbInterests = cleanStringList(
    Array.isArray(user.onboardingInterests) ? user.onboardingInterests : []
  );

  const domains = Array.from(
    new Set(
      [...dbDomains, ...(clientContext.domains || [])]
        .map((domain) => normalizeDomain(domain) || domain)
        .filter(Boolean)
    )
  ).slice(0, 8);

  const interests = Array.from(
    new Set([...dbInterests, ...(clientContext.interests || [])].filter(Boolean))
  ).slice(0, 10);

  const name = toText(user.name) || cleanText(clientContext.name, 80) || null;

  const profile = {
    id: userId,
    name,
    firstName: name ? name.split(" ")[0] : null,
    role: user.role || null,
    bio: toText(user.bio) || null,
    domains,
    interests,
    goal: toText(user.onboardingGoal) || cleanText(clientContext.goal, 160) || null,
    guidance: toText(user.onboardingGuidance) || cleanText(clientContext.guidance, 160) || null,
    career: toText(user.onboardingCareer) || cleanText(clientContext.career, 160) || null,
    education:
      toText(user.onboardingEducation) || cleanText(clientContext.education, 160) || null,
    onboardingCompleted:
      Boolean(user.onboardingCompleted) ||
      Boolean(clientContext.goal || clientContext.guidance) ||
      domains.length > 0,
    sources: {
      database: Boolean(storedProfile?.onboardingStored),
      browser: Boolean(
        clientContext.goal ||
          clientContext.guidance ||
          clientContext.career ||
          (clientContext.domains || []).length ||
          (clientContext.interests || []).length
      ),
    },
  };

  profile.interestDomains = domainsFromProfile(profile);

  return profile;
}

/**
 * Compact text block used inside the Gemini prompts.
 * Only non-sensitive information is included.
 */
function formatProfileForPrompt(profile) {
  if (!profile) return "No learner profile available.";

  const lines = [
    `Name: ${profile.name || "Not provided"}`,
    `Selected domains: ${profile.domains?.length ? profile.domains.join(", ") : "None yet"}`,
    `Interests: ${profile.interests?.length ? profile.interests.join(", ") : "None yet"}`,
    `Main goal: ${profile.goal || "Not provided"}`,
    `Areas where guidance is needed: ${profile.guidance || "Not provided"}`,
    `Career / academic interest: ${profile.career || "Not provided"}`,
    `Education level: ${profile.education || "Not provided"}`,
  ];

  return lines.join("\n");
}

/**
 * Fields accepted by POST /api/onboarding (all of them optional).
 */
function cleanOnboardingPayload(body = {}) {
  const domains = cleanStringList(body.domains);
  const interests = cleanStringList(body.interests);

  return {
    onboardingDomains: domains.map((domain) => normalizeDomain(domain) || domain).slice(0, 8),
    onboardingInterests: interests,
    onboardingGoal: cleanText(body.goal, 160) || null,
    onboardingGuidance: cleanText(body.guidance, 160) || null,
    onboardingCareer: cleanText(body.career, 160) || null,
    onboardingEducation: cleanText(body.education, 160) || null,
    onboardingCompleted: true,
    onboardingCompletedAt: new Date(),
  };
}

module.exports = {
  getStoredLearnerProfile,
  buildLearnerProfile,
  formatProfileForPrompt,
  cleanOnboardingPayload,
  BASE_SELECT,
  ONBOARDING_SELECT,
};
