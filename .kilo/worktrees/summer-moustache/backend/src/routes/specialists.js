/**
 * Specialists routes — public, read-only.
 *
 * These existed as a gap in the backend (the frontend api client already
 * called /specialists): the AI chat needs to recommend specialists by domain,
 * and the recommendation cards need a page that can load ONE specialist,
 * workshop or post from PostgreSQL.
 *
 * Only public profile information is returned (never email or password).
 */

const express = require("express");
const prisma = require("../lib/prisma");
const { normalizeDomain } = require("../lib/domains");

const router = express.Router();

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  image: true,
  bio: true,
};

function serializeSpecialist(specialist) {
  return {
    id: specialist.id,
    userId: specialist.userId,
    name: specialist.user?.name || "Learnova specialist",
    image: specialist.user?.image || null,
    bio: specialist.user?.bio || null,
    domain: specialist.domain || "General Guidance",
    qualification: specialist.qualification || null,
    experience: specialist.experience || null,
    specialization: specialist.qualification || specialist.experience || "General guidance",
    verification: specialist.verification,
    verified: specialist.verification === "VERIFIED",
    verifiedAt: specialist.verifiedAt || null,
  };
}

/* ------------------------------------------------------------------ *
 * GET /api/specialists?domain=...&q=...&limit=...
 * ------------------------------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const domain = normalizeDomain(req.query.domain);
    const search = String(req.query.q || "").trim().slice(0, 80);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    const where = {
      user: { role: "SPECIALIST" },
    };

    if (domain) {
      where.domain = domain;
    }

    if (search) {
      where.OR = [
        { domain: { contains: search, mode: "insensitive" } },
        { qualification: { contains: search, mode: "insensitive" } },
        { experience: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const specialists = await prisma.specialist.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        domain: true,
        qualification: true,
        experience: true,
        verification: true,
        verifiedAt: true,
        user: { select: PUBLIC_USER_SELECT },
      },
    });

    return res.json({
      success: true,
      specialists: specialists.map(serializeSpecialist),
    });
  } catch (error) {
    console.error("GET SPECIALISTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load specialists",
    });
  }
});

/* ------------------------------------------------------------------ *
 * GET /api/specialists/:id  (accepts a Specialist id OR a User id)
 * ------------------------------------------------------------------ */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const specialist = await prisma.specialist.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      select: {
        id: true,
        userId: true,
        domain: true,
        qualification: true,
        experience: true,
        verification: true,
        verifiedAt: true,
        createdAt: true,
        user: { select: PUBLIC_USER_SELECT },
      },
    });

    if (!specialist) {
      return res.status(404).json({
        success: false,
        message: "Specialist not found",
      });
    }

    const [workshops, posts] = await Promise.all([
      prisma.workshop.findMany({
        where: { specialistId: specialist.userId },
        take: 6,
        orderBy: { date: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          image: true,
          type: true,
          price: true,
          date: true,
        },
      }),
      prisma.post.findMany({
        where: { authorId: specialist.userId },
        take: 3,
        orderBy: { createdAt: "desc" },
        select: { id: true, domain: true, text: true, image: true, createdAt: true },
      }),
    ]);

    return res.json({
      success: true,
      specialist: {
        ...serializeSpecialist(specialist),
        createdAt: specialist.createdAt,
      },
      workshops: workshops.map((workshop) => ({
        ...workshop,
        domain: specialist.domain,
        specialist: specialist.user?.name || null,
      })),
      posts,
    });
  } catch (error) {
    console.error("GET SPECIALIST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load this specialist",
    });
  }
});

module.exports = router;
