const router = require("express").Router();
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { options, validatePreferences } = require("../lib/learnerPreferences");

const userSelect = { id: true, name: true, email: true, image: true, bio: true };

function scoreSpecialistMatch(learnerProfile, specialist) {
  if (!learnerProfile) {
    return {
      matchScore: 80,
      matchReason: `Verified expert in ${specialist.domain}`,
      matchBadges: [specialist.domain],
    };
  }

  const { interests = [], goals = [], formats = [], aspiration = "" } = learnerProfile;

  let score = 50; // Base score for verified specialists
  const matchedBadges = new Set();
  const reasons = [];

  // 1. Domain match (+30 points)
  if (interests.some(i => i.toLowerCase() === specialist.domain.toLowerCase())) {
    score += 30;
    matchedBadges.add(specialist.domain);
    reasons.push(`Matches your interest in ${specialist.domain}`);
  }

  // 2. Expertise overlap (+20 points max)
  const matchingExpertise = (specialist.expertise || []).filter(exp =>
    interests.some(i => i.toLowerCase().includes(exp.toLowerCase()) || exp.toLowerCase().includes(i.toLowerCase())) ||
    goals.some(g => g.toLowerCase().includes(exp.toLowerCase()) || exp.toLowerCase().includes(g.toLowerCase()))
  );

  if (matchingExpertise.length > 0) {
    score += Math.min(20, matchingExpertise.length * 10);
    matchingExpertise.forEach(e => matchedBadges.add(e));
    reasons.push(`Expertise in ${matchingExpertise.slice(0, 2).join(" & ")}`);
  }

  // 3. Aspiration and goal keywords (+15 points max)
  const combinedSpecialistText = `${specialist.headline || ""} ${specialist.howIHelp || ""} ${(specialist.expertiseDescriptions || []).join(" ")} ${specialist.user?.bio || ""}`.toLowerCase();

  if (aspiration && aspiration.trim()) {
    const aspWords = aspiration.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const matchedWords = aspWords.filter(word => combinedSpecialistText.includes(word));
    if (matchedWords.length > 0) {
      score += Math.min(15, matchedWords.length * 5);
      reasons.push(`Fits your goal: "${aspiration.slice(0, 35)}${aspiration.length > 35 ? "..." : ""}"`);
    }
  }

  // 4. Session Format Match (+10 points)
  const matchingFormats = (specialist.sessionFormats || []).filter(sf =>
    formats.some(f => f.toLowerCase().includes(sf.toLowerCase()) || sf.toLowerCase().includes(f.toLowerCase()))
  );

  if (matchingFormats.length > 0) {
    score += 10;
    reasons.push(`Offers ${matchingFormats[0]}`);
  }

  // 5. Open availability bonus (+5 points)
  const openSlots = (specialist.availability || []).filter(a => !a.booked);
  if (openSlots.length > 0) {
    score += 5;
  }

  // Keep relevance scoring for sorting without assigning every specialist an artificial minimum match.
  const finalScore = Math.min(99, score);

  // Default fallback badge if none matched
  if (matchedBadges.size === 0) {
    matchedBadges.add(specialist.domain);
  }

  const finalReason = reasons.length > 0
    ? reasons.slice(0, 2).join(" · ")
    : `Verified specialist in ${specialist.domain}`;

  return {
    matchScore: finalScore,
    matchReason: finalReason,
    matchBadges: Array.from(matchedBadges).slice(0, 3),
  };
}

router.use(requireAuth, requireRole("LEARNER"));

router.get("/me/preferences", async (req, res) => {
  try {
    const [profile, dbDomains] = await Promise.all([
      prisma.learnerProfile.findUnique({ where: { userId: req.auth.userId } }),
      prisma.domain.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    ]);
    const liveOptions = {
      ...options,
      interests: dbDomains.length ? dbDomains.map(d => d.name) : options.interests,
    };
    res.json({ profile, options: liveOptions });
  } catch (error) {
    console.error("LEARNER PREFERENCES:", error);
    res.status(500).json({ message: "Couldn't load your preferences. Please try again." });
  }
});

router.put("/me/preferences", async (req, res) => {
  const message = validatePreferences(req.body);
  if (message) return res.status(400).json({ message });
  const { interests, goals, formats, stage, aspiration, complete } = req.body;
  const data = { interests, goals, formats, stage, aspiration: aspiration.trim() };
  try {
    const profile = await prisma.learnerProfile.upsert({
      where: { userId: req.auth.userId },
      create: { userId: req.auth.userId, ...data, ...(complete ? { completedAt: new Date() } : {}) },
      update: { ...data, ...(complete ? { completedAt: new Date() } : {}) },
    });
    res.json({ profile });
  } catch (error) {
    console.error("SAVE LEARNER PREFERENCES:", error);
    res.status(500).json({ message: "Couldn't save your preferences. Your choices are still here; please try again." });
  }
});

// ==========================
// AI RECOMMENDATIONS ENDPOINT
// ==========================
router.get("/me/recommendations", async (req, res) => {
  try {
    const [learnerProfile, specialists] = await Promise.all([
      prisma.learnerProfile.findUnique({ where: { userId: req.auth.userId } }),
      prisma.specialist.findMany({
        where: { verification: "VERIFIED" },
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: userSelect },
          availability: { where: { booked: false, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 3 },
        },
      }),
    ]);

    const sessionCounts = await Promise.all(
      specialists.map(profile => prisma.appointment.count({ where: { specialistId: profile.userId, status: "COMPLETED" } }))
    );

    const scoredSpecialists = specialists.map((spec, index) => {
      const match = scoreSpecialistMatch(learnerProfile, spec);
      return {
        ...spec,
        completedSessions: sessionCounts[index],
        matchScore: match.matchScore,
        matchReason: match.matchReason,
        matchBadges: match.matchBadges,
      };
    });

    // Sort by AI Match Score descending
    scoredSpecialists.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({
      success: true,
      learnerProfile,
      recommendations: scoredSpecialists,
    });
  } catch (error) {
    console.error("GET AI RECOMMENDATIONS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to generate AI recommendations." });
  }
});

module.exports = router;
