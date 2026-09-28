/**
 * Database recommendation service.
 *
 * Every specialist / post / workshop returned to the learner is loaded from
 * PostgreSQL through Prisma — the AI never invents a Learnova resource. The
 * model is only allowed to *choose* (by id) among the candidates we retrieved,
 * and any id it returns that is not in the database is discarded here.
 */

const prisma = require("../lib/prisma");
const { normalizeText } = require("../lib/domains");

const MAX_PER_TYPE = 3;
const CANDIDATE_LIMIT = 8;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

function truncate(value, max = 220) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();

  if (text.length <= max) return text;

  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * First sentence (or first ~90 characters) of a post used as its title,
 * because Learnova posts only store `text`.
 */
function postTitle(text) {
  const cleaned = String(text ?? "").replace(/\s+/g, " ").trim();

  if (!cleaned) return "Learnova community post";

  const sentence = cleaned.split(/(?<=[.!?])\s/)[0];

  if (sentence.length <= 90) return sentence;

  return `${truncate(sentence, 88)}`;
}

function containsInsensitive(value) {
  return { contains: String(value), mode: "insensitive" };
}

function scoreText(text, keywords) {
  const haystack = normalizeText(text);

  if (!haystack) return 0;

  return keywords.reduce(
    (total, keyword) => (haystack.includes(normalizeText(keyword)) ? total + 1 : total),
    0
  );
}

/* ------------------------------------------------------------------ *
 * Candidate searches (always limited + ordered, never unbounded)
 * ------------------------------------------------------------------ */

/**
 * Specialists by domain, with their expertise/specialisation
 * (Specialist.qualification / Specialist.experience).
 * Only specialists the Learnova admin team verified are recommended.
 */
async function findSpecialistCandidates({ domains = [], keywords = [], limit = CANDIDATE_LIMIT } = {}) {
  const or = [];

  if (domains.length) {
    or.push({ domain: { in: domains } });
  }

  for (const keyword of keywords) {
    or.push({ domain: containsInsensitive(keyword) });
    or.push({ qualification: containsInsensitive(keyword) });
    or.push({ experience: containsInsensitive(keyword) });
    or.push({ user: { name: containsInsensitive(keyword) } });
    or.push({ user: { bio: containsInsensitive(keyword) } });
  }

  const where = {
    verification: "VERIFIED",
    ...(or.length ? { OR: or } : {}),
  };

  const specialists = await prisma.specialist.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      domain: true,
      qualification: true,
      experience: true,
      verification: true,
      user: {
        select: { id: true, name: true, image: true, bio: true, role: true },
      },
    },
  });

  return specialists
    .filter((specialist) => specialist.user && specialist.user.role === "SPECIALIST")
    .map((specialist) => ({
      kind: "specialist",
      id: specialist.id,
      userId: specialist.user.id,
      name: specialist.user.name,
      image: specialist.user.image,
      domain: specialist.domain || "General Guidance",
      specialization:
        specialist.qualification || specialist.experience || "General guidance",
      experience: specialist.experience || null,
      description: specialist.user.bio || "Verified Learnova specialist.",
      verified: specialist.verification === "VERIFIED",
      url: `/resource/specialist/${specialist.user.id}`,
      bookUrl: `/appointments?specialist=${specialist.user.id}`,
      score:
        (domains.includes(specialist.domain) ? 3 : 0) +
        scoreText(
          `${specialist.domain} ${specialist.qualification || ""} ${specialist.experience || ""} ${specialist.user.bio || ""}`,
          keywords
        ),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Community posts by domain and/or keyword.
 */
async function findPostCandidates({ domains = [], keywords = [], limit = CANDIDATE_LIMIT } = {}) {
  const or = [];

  if (domains.length) {
    or.push({ domain: { in: domains } });
  }

  for (const keyword of keywords) {
    or.push({ domain: containsInsensitive(keyword) });
    or.push({ text: containsInsensitive(keyword) });
  }

  const posts = await prisma.post.findMany({
    where: or.length ? { OR: or } : {},
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      domain: true,
      text: true,
      image: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true } },
    },
  });

  return posts.map((post) => ({
    kind: "post",
    id: post.id,
    title: postTitle(post.text),
    description: truncate(post.text, 240),
    image: post.image,
    domain: post.domain || "General Guidance",
    author: post.author?.name || "Learnova specialist",
    authorId: post.author?.id || null,
    authorImage: post.author?.image || null,
    createdAt: post.createdAt,
    url: `/resource/post/${post.id}`,
    score: (domains.includes(post.domain) ? 3 : 0) + scoreText(post.text, keywords),
  })).sort((a, b) => b.score - a.score);
}

/**
 * Workshops by domain and/or keyword.
 * A workshop has no domain column: the domain comes from the specialist
 * profile of the user who created it, so we resolve those users first.
 */
async function findWorkshopCandidates({ domains = [], keywords = [], limit = CANDIDATE_LIMIT } = {}) {
  const or = [];

  for (const keyword of keywords) {
    or.push({ title: containsInsensitive(keyword) });
    or.push({ description: containsInsensitive(keyword) });
  }

  if (domains.length) {
    const specialists = await prisma.specialist.findMany({
      where: { domain: { in: domains } },
      select: { userId: true },
      take: 100,
    });

    const userIds = specialists.map((specialist) => specialist.userId).filter(Boolean);

    if (userIds.length) {
      or.push({ specialistId: { in: userIds } });
    }
  }

  if (!or.length) return [];

  const workshops = await prisma.workshop.findMany({
    where: { OR: or },
    take: limit,
    orderBy: { date: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      image: true,
      type: true,
      price: true,
      date: true,
      specialistId: true,
      specialist: { select: { id: true, name: true, image: true } },
    },
  });

  if (!workshops.length) return [];

  // Resolve the specialist domain for each workshop author.
  const authorIds = Array.from(new Set(workshops.map((workshop) => workshop.specialistId)));

  const profiles = await prisma.specialist.findMany({
    where: { userId: { in: authorIds } },
    select: { userId: true, domain: true },
  });

  const domainByUserId = new Map(profiles.map((profile) => [profile.userId, profile.domain]));

  return workshops
    .map((workshop) => {
      const domain = domainByUserId.get(workshop.specialistId) || "General Guidance";

      return {
        kind: "workshop",
        id: workshop.id,
        title: workshop.title,
        description: truncate(workshop.description, 220),
        image: workshop.image,
        domain,
        type: workshop.type === "PAID" ? "PAID" : "FREE",
        price: workshop.price ?? null,
        date: workshop.date,
        specialist: workshop.specialist?.name || "Learnova specialist",
        specialistId: workshop.specialistId,
        url: `/resource/workshop/${workshop.id}`,
        score:
          (domains.includes(domain) ? 3 : 0) +
          scoreText(`${workshop.title} ${workshop.description}`, keywords),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Search every recommendation type for the analysed request.
 * A failure in one query never breaks the others.
 */
async function searchLearnovaResources({ domains = [], keywords = [], limitPerType = CANDIDATE_LIMIT } = {}) {
  const results = { specialists: [], posts: [], workshops: [] };

  const sessions = [
    ["specialists", () => findSpecialistCandidates({ domains, keywords, limit: limitPerType })],
    ["posts", () => findPostCandidates({ domains, keywords, limit: limitPerType })],
    ["workshops", () => findWorkshopCandidates({ domains, keywords, limit: limitPerType })],
  ];

  for (const [key, run] of sessions) {
    try {
      results[key] = await run();
    } catch (error) {
      console.error(`AI RESOURCE SEARCH ERROR (${key}):`, error?.message || error);
      results[key] = [];
    }
  }

  const total = results.specialists.length + results.posts.length + results.workshops.length;

  return { ...results, total, hasResources: total > 0 };
}

/* ------------------------------------------------------------------ *
 * Selection → final card payloads
 * ------------------------------------------------------------------ */

function findCandidate(list, id) {
  return list.find((candidate) => String(candidate.id) === String(id)) || null;
}

function cleanReason(reason, candidate) {
  const cleaned = String(reason ?? "").replace(/\s+/g, " ").trim();

  if (cleaned.length >= 8) return truncate(cleaned, 180);

  return `Relevant because it matches your ${candidate.domain} interest on Learnova.`;
}

function toCard(candidate, reason) {
  const shared = { kind: candidate.kind, id: candidate.id, reason: cleanReason(reason, candidate) };

  if (candidate.kind === "specialist") {
    return {
      ...shared,
      id: candidate.userId,
      profileId: candidate.id,
      name: candidate.name,
      image: candidate.image,
      domain: candidate.domain,
      specialization: candidate.specialization,
      description: truncate(candidate.description, 200),
      verified: candidate.verified,
      url: candidate.url,
      bookUrl: candidate.bookUrl,
    };
  }

  if (candidate.kind === "post") {
    return {
      ...shared,
      title: candidate.title,
      description: candidate.description,
      image: candidate.image,
      domain: candidate.domain,
      author: candidate.author,
      authorId: candidate.authorId,
      createdAt: candidate.createdAt,
      url: candidate.url,
    };
  }

  return {
    ...shared,
    title: candidate.title,
    description: candidate.description,
    image: candidate.image,
    domain: candidate.domain,
    type: candidate.type,
    price: candidate.type === "PAID" ? candidate.price : null,
    date: candidate.date,
    specialist: candidate.specialist,
    url: candidate.url,
  };
}

/**
 * Build the final `recommendations` object.
 *
 * @param {object} candidates     Result of searchLearnovaResources().
 * @param {object} selections     Gemini's { specialists: [{id, reason}], ... }.
 * @param {object} [options]
 * @param {boolean} [options.fillFromCandidates] Use the best-scoring database
 *        rows when the model did not select anything (never invents data).
 */
function buildRecommendations(candidates, selections = {}, { fillFromCandidates = false } = {}) {
  const build = (type, list) => {
    const chosen = Array.isArray(selections[type]) ? selections[type] : [];
    const cards = [];
    const usedIds = new Set();

    for (const selection of chosen) {
      const id = typeof selection === "string" ? selection : selection?.id;
      const candidate = id ? findCandidate(list, id) : null;

      // Hallucinated / unknown ids are dropped: recommendations must exist
      // in the Learnova database.
      if (!candidate || usedIds.has(candidate.id)) continue;

      usedIds.add(candidate.id);
      cards.push(toCard(candidate, selection?.reason));

      if (cards.length >= MAX_PER_TYPE) break;
    }

    if (!cards.length && fillFromCandidates) {
      for (const candidate of list.slice(0, MAX_PER_TYPE)) {
        cards.push(toCard(candidate, null));
      }
    }

    return cards;
  };

  return {
    specialists: build("specialists", candidates.specialists || []),
    posts: build("posts", candidates.posts || []),
    workshops: build("workshops", candidates.workshops || []),
  };
}

/**
 * Compact candidate list for the Gemini prompt.
 */
function buildCandidateDigest(candidates) {
  const lines = [];

  for (const specialist of candidates.specialists || []) {
    lines.push(
      `- [specialist] id=${specialist.id} | ${specialist.name} | domain: ${specialist.domain} | specialisation: ${specialist.specialization} | ${truncate(specialist.description, 120)}`
    );
  }

  for (const post of candidates.posts || []) {
    lines.push(
      `- [post] id=${post.id} | ${truncate(post.title, 90)} | domain: ${post.domain} | by ${post.author} | ${truncate(post.description, 120)}`
    );
  }

  for (const workshop of candidates.workshops || []) {
    lines.push(
      `- [workshop] id=${workshop.id} | ${workshop.title} | domain: ${workshop.domain} | ${workshop.type}${workshop.type === "PAID" && workshop.price ? ` (${workshop.price})` : ""} | by ${workshop.specialist} | ${workshop.date ? new Date(workshop.date).toISOString().slice(0, 10) : "date not set"}`
    );
  }

  return lines.length ? lines.join("\n") : "No matching resources were found in the Learnova database.";
}

module.exports = {
  MAX_PER_TYPE,
  CANDIDATE_LIMIT,
  findSpecialistCandidates,
  findPostCandidates,
  findWorkshopCandidates,
  searchLearnovaResources,
  buildRecommendations,
  buildCandidateDigest,
  postTitle,
};
