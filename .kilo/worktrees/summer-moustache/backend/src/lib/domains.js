/**
 * Learnova domains + lightweight keyword routing.
 *
 * The AI guidance chat needs to map a free-text learner question to one of
 * the domains that already exist in the Learnova database, so that the
 * specialists / posts / workshops we recommend actually match what the
 * learner is asking about.
 */

const LEARNOVA_DOMAINS = [
  "Career Guidance",
  "Academic Guidance",
  "Mental Wellbeing",
  "Entrepreneurship",
  "Agriculture",
  "Personal Development",
  "General Guidance",
];

/**
 * Keywords used to route a message to a domain when Gemini is unavailable
 * (or when its answer cannot be trusted).
 */
const DOMAIN_KEYWORDS = {
  "Career Guidance": [
    "career", "job", "jobs", "profession", "professional", "cv", "resume",
    "interview", "employment", "employee", "employer", "internship",
    "work", "salary", "recruiter", "freelance", "role", "position",
  ],
  "Academic Guidance": [
    "study", "studies", "studying", "exam", "exams", "revision", "school",
    "university", "college", "course", "courses", "academic", "homework",
    "assignment", "thesis", "research", "grades", "teacher", "scholarship",
    "baccalaureate", "gce", "notes", "concentration",
  ],
  "Mental Wellbeing": [
    "stress", "stressed", "anxiety", "anxious", "depressed", "depression",
    "burnout", "overwhelmed", "mental", "wellbeing", "wellness", "sad",
    "lonely", "sleep", "confidence", "self-esteem", "panic", "trauma",
  ],
  Entrepreneurship: [
    "business", "businesses", "startup", "startups", "entrepreneur",
    "entrepreneurship", "company", "sell", "selling", "sales", "customer",
    "customers", "market", "marketing", "product", "profit", "revenue",
    "funding", "investor", "invoice", "shop", "store", "ecommerce",
    "brand", "pricing", "supplier",
  ],
  Agriculture: [
    "agriculture", "agricultural", "farm", "farming", "farmer", "crop",
    "crops", "maize", "cassava", "tomato", "plantain", "livestock", "poultry",
    "chicken", "cattle", "soil", "seed", "seeds", "harvest", "irrigation",
    "fertilizer", "agribusiness", "garden", "greenhouse", "fish", "fishery",
  ],
  "Personal Development": [
    "personal development", "self improvement", "habit", "habits",
    "discipline", "motivation", "productivity", "time management", "goals",
    "goal setting", "leadership", "communication", "public speaking",
    "mindset", "growth", "organisation", "organization", "focus",
  ],
};

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "also", "because", "been", "before",
  "being", "between", "could", "does", "doing", "done", "from", "have",
  "having", "help", "into", "just", "know", "like", "make", "many", "more",
  "most", "much", "need", "only", "other", "over", "please", "really",
  "should", "some", "something", "such", "than", "that", "their", "them",
  "then", "there", "these", "they", "thing", "things", "this", "those",
  "through", "under", "very", "want", "well", "what", "when", "where",
  "which", "while", "will", "with", "without", "would", "your", "yours",
  "learnova", "hello", "hi", "hey", "thanks", "thank", "give", "show",
  "tell", "find", "looking", "look", "start", "starting", "started",
]);

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map any domain-ish string ("entrepreneurship", "Career", ...) to a
 * canonical Learnova domain, or null when nothing matches.
 */
function normalizeDomain(value) {
  const cleaned = normalizeText(value);

  if (!cleaned) return null;

  const exact = LEARNOVA_DOMAINS.find((d) => normalizeText(d) === cleaned);
  if (exact) return exact;

  const partial = LEARNOVA_DOMAINS.find((d) => {
    const target = normalizeText(d);
    return cleaned.includes(target) || target.includes(cleaned);
  });
  if (partial) return partial;

  return detectDomainFromText(cleaned);
}

/**
 * Very small keyword classifier used as a safety net around Gemini.
 */
function detectDomainFromText(text) {
  const cleaned = normalizeText(text);

  if (!cleaned) return null;

  let best = null;
  let bestScore = 0;

  for (const domain of Object.keys(DOMAIN_KEYWORDS)) {
    const score = DOMAIN_KEYWORDS[domain].reduce((total, keyword) => {
      const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "g");
      const matches = cleaned.match(pattern);
      return total + (matches ? matches.length : 0);
    }, 0);

    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Extract meaningful keywords from a learner message (used for the
 * database search fallback and for scoring candidates).
 */
function extractKeywords(text, { max = 8 } = {}) {
  const tokens = normalizeText(text)
    .split(" ")
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));

  return Array.from(new Set(tokens)).slice(0, max);
}

/**
 * All domains a learner profile is interested in.
 */
function domainsFromProfile(profile = {}) {
  const collected = [];

  const push = (value) => {
    const domain = normalizeDomain(value);

    if (domain && !collected.includes(domain)) {
      collected.push(domain);
    }
  };

  if (profile.domain) push(profile.domain);
  if (Array.isArray(profile.domains)) profile.domains.forEach(push);
  if (Array.isArray(profile.interests)) profile.interests.forEach(push);
  if (profile.goal) push(profile.goal);
  if (profile.career) push(profile.career);

  return collected;
}

module.exports = {
  LEARNOVA_DOMAINS,
  DOMAIN_KEYWORDS,
  normalizeText,
  normalizeDomain,
  detectDomainFromText,
  extractKeywords,
  domainsFromProfile,
};
