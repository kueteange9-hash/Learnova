const { defaultDomains } = require("./initDefaults");

const baseOptions = {
  interests: defaultDomains.map(d => d.name),
  goals: [
    "Explore my options",
    "Build practical skills",
    "Find a mentor",
    "Prepare for work",
    "Grow a business",
    "Build confidence",
    "Connect with other learners",
  ],
  formats: ["One-to-one guidance", "Live workshops", "Community discussions"],
  stage: [
    "In school",
    "In higher education",
    "Looking for work",
    "Working",
    "Running a business",
    "Exploring my next step",
  ],
};

function validatePreferences(body, availableInterests = baseOptions.interests) {
  if (!body || typeof body !== "object" || typeof body.complete !== "boolean") return "Invalid preferences.";

  const validOptions = {
    ...baseOptions,
    interests: availableInterests && availableInterests.length ? availableInterests : baseOptions.interests,
  };

  for (const key of ["interests", "goals", "formats"]) {
    const values = body[key];
    if (!Array.isArray(values) || values.some(value => typeof value !== "string" || !value.trim())) {
      return `Choose valid ${key}.`;
    }
    if (body.complete && !values.length) {
      return `Choose at least one option for ${key}.`;
    }
  }

  if (!validOptions.stage.includes(body.stage) && !(body.stage === "" && !body.complete)) {
    return "Choose your current stage.";
  }

  if (typeof body.aspiration !== "string" || body.aspiration.length > 500) {
    return "Keep your learning goal within 500 characters.";
  }

  return null;
}

module.exports = { options: baseOptions, validatePreferences };
