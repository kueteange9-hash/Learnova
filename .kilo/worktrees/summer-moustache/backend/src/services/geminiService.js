/**
 * Learnova AI service — Google Gemini integration.
 *
 * The backend is plain CommonJS JavaScript, so this service lives in
 * `src/services/geminiService.js` (same file the feature spec calls
 * `src/services/geminiService.ts`).
 *
 * Why the REST API instead of an SDK?
 *  - no extra dependency to install / keep in sync,
 *  - works on Node 18+ with the built-in `fetch`,
 *  - easy to point at a mock server while testing
 *    (set GEMINI_API_BASE_URL).
 *
 * Environment variables (backend/.env):
 *   GEMINI_API_KEY=your_actual_key_here   (required, never sent to the browser)
 *   GEMINI_MODEL=gemini-3.8-flash         (optional, defaults below)
 *   GEMINI_TIMEOUT_MS=30000               (optional)
 *   GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com  (optional)
 */

const API_BASE = (
  process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com"
).replace(/\/+$/, "");

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/**
 * Models tried in order. The first entry is the configured/default model;
 * the others are only tried when the API answers 404 (model not available
 * for this API key), so the feature keeps working across Gemini releases.
 */
const MODEL_FALLBACKS = Array.from(
  new Set(
    [
      DEFAULT_MODEL,
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash",
    ].filter(Boolean)
  )
);

const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30_000);

class GeminiError extends Error {
  constructor(message, { code = "GEMINI_ERROR", status = 502, retryable = false } = {}) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function apiKey() {
  return (process.env.GEMINI_API_KEY || "").trim();
}

/**
 * Is the Gemini integration configured at all?
 * (Used by GET /api/ai/health — the key itself is never returned.)
 */
function isConfigured() {
  return apiKey().length > 0;
}

/**
 * Turn an HTTP failure into a learner-friendly, safe error.
 */
function mapHttpError(status, bodyText) {
  let apiMessage = "";

  try {
    const parsed = JSON.parse(bodyText);
    apiMessage = parsed?.error?.message || "";
  } catch {
    apiMessage = "";
  }

  const suffix = apiMessage ? ` (${apiMessage.slice(0, 200)})` : "";

  if (status === 400) {
    return new GeminiError(
      `The AI service rejected the request${suffix}. Please try rephrasing your question.`,
      { code: "GEMINI_BAD_REQUEST", status: 502 }
    );
  }

  if (status === 401 || status === 403) {
    return new GeminiError(
      "The AI service rejected the server API key. Please check GEMINI_API_KEY in backend/.env.",
      { code: "GEMINI_AUTH_ERROR", status: 502 }
    );
  }

  if (status === 404) {
    return new GeminiError(
      `The configured Gemini model is not available for this API key${suffix}. ` +
        "Set GEMINI_MODEL in backend/.env to a model your key can use (for example gemini-3.8-flash).",
      { code: "GEMINI_MODEL_NOT_FOUND", status: 502 }
    );
  }

  if (status === 429) {
    return new GeminiError(
      "The AI assistant is receiving too many requests right now. Please try again in a moment.",
      { code: "GEMINI_RATE_LIMITED", status: 429, retryable: true }
    );
  }

  return new GeminiError(
    `The AI service is temporarily unavailable${suffix}. Please try again shortly.`,
    { code: "GEMINI_UNAVAILABLE", status: 503, retryable: true }
  );
}

/**
 * Tolerant JSON parsing: Gemini occasionally wraps JSON in ```json fences.
 */
function safeParseJson(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  const cleaned = rawText
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const candidates = [cleaned];

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try the next candidate */
    }
  }

  return null;
}

async function callModel({ model, systemInstruction, contents, temperature, maxOutputTokens }) {
  const url = `${API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The key stays on the server: it is never exposed to the browser.
        "x-goog-api-key": apiKey(),
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    const bodyText = await response.text();

    if (!response.ok) {
      throw mapHttpError(response.status, bodyText);
    }

    let payload = null;

    try {
      payload = JSON.parse(bodyText);
    } catch {
      throw new GeminiError("The AI service returned an unreadable response.", {
        code: "GEMINI_BAD_RESPONSE",
        status: 502,
      });
    }

    const candidateText = (payload?.candidates?.[0]?.content?.parts || [])
      .map((part) => part?.text || "")
      .join("")
      .trim();

    if (!candidateText) {
      const blocked = payload?.promptFeedback?.blockReason;

      throw new GeminiError(
        blocked
          ? "The AI assistant could not answer that message. Please rephrase it."
          : "The AI assistant returned an empty answer. Please try again.",
        { code: "GEMINI_EMPTY_RESPONSE", status: 502, retryable: true }
      );
    }

    return { text: candidateText, model, raw: payload };
  } catch (error) {
    if (error instanceof GeminiError) throw error;

    if (error.name === "AbortError") {
      throw new GeminiError(
        "The AI assistant took too long to answer. Please try again.",
        { code: "GEMINI_TIMEOUT", status: 504, retryable: true }
      );
    }

    console.error("GEMINI REQUEST ERROR:", error?.message || error);

    throw new GeminiError(
      "We could not reach the AI service. Please check the server connection and try again.",
      { code: "GEMINI_UNREACHABLE", status: 503, retryable: true }
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Ask Gemini for a JSON answer.
 *
 * @param {object} params
 * @param {string} params.systemInstruction  Persona / rules.
 * @param {Array}  params.contents           [{ role: "user"|"model", parts: [{ text }] }]
 * @param {number} [params.temperature]
 * @param {number} [params.maxOutputTokens]
 * @returns {Promise<{ data: object|null, text: string, model: string }>}
 */
async function generateJson({
  systemInstruction,
  contents,
  temperature = 0.4,
  maxOutputTokens = 1200,
}) {
  if (!isConfigured()) {
    throw new GeminiError(
      "The AI assistant is not configured yet. Add GEMINI_API_KEY to backend/.env and restart the server.",
      { code: "GEMINI_NOT_CONFIGURED", status: 503 }
    );
  }

  let lastError = null;

  for (const model of MODEL_FALLBACKS) {
    try {
      const result = await callModel({
        model,
        systemInstruction,
        contents,
        temperature,
        maxOutputTokens,
      });

      return {
        data: safeParseJson(result.text),
        text: result.text,
        model: result.model,
      };
    } catch (error) {
      lastError = error;

      // Only fall through to the next model when this model does not exist
      // for the current API key. Everything else is a real error.
      if (error?.code !== "GEMINI_MODEL_NOT_FOUND") {
        throw error;
      }

      console.warn(`GEMINI MODEL unavailable: ${model}. Trying the next fallback.`);
    }
  }

  throw lastError;
}

module.exports = {
  GeminiError,
  generateJson,
  isConfigured,
  safeParseJson,
  DEFAULT_MODEL,
  MODEL_FALLBACKS,
};
