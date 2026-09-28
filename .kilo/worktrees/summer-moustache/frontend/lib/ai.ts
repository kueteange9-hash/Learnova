// Learnova AI Guidance Chat — client types + helpers.
//
// The Gemini API key lives only in backend/.env and is used by
// backend/src/services/geminiService.js. The browser only ever calls
// POST /api/ai/chat on the Express backend.

import { api } from "./api";
import { getOnboarding, User } from "./store";

/* ------------------------------------------------------------------ *
 * Types (mirror the backend response shape)
 * ------------------------------------------------------------------ */

export type AiRecommendationKind = "specialist" | "workshop" | "post";

export type AiSpecialistRecommendation = {
  kind: "specialist";
  /** Learnova user id — used for links and appointments. */
  id: string;
  /** Specialist profile id (prisma Specialist.id). */
  profileId?: string | null;
  name: string;
  image?: string | null;
  domain: string;
  specialization?: string | null;
  description?: string | null;
  verified?: boolean;
  reason?: string | null;
  url: string;
  bookUrl?: string | null;
};

export type AiPostRecommendation = {
  kind: "post";
  id: string;
  title: string;
  description: string;
  image?: string | null;
  domain: string;
  author?: string | null;
  authorId?: string | null;
  createdAt?: string | null;
  reason?: string | null;
  url: string;
};

export type AiWorkshopRecommendation = {
  kind: "workshop";
  id: string;
  title: string;
  description: string;
  image?: string | null;
  domain: string;
  type: "FREE" | "PAID";
  price?: number | null;
  date?: string | null;
  specialist?: string | null;
  reason?: string | null;
  url: string;
};

export type AiRecommendations = {
  specialists: AiSpecialistRecommendation[];
  posts: AiPostRecommendation[];
  workshops: AiWorkshopRecommendation[];
};

export type AiProfileSummary = {
  name?: string | null;
  firstName?: string | null;
  domains?: string[];
  interests?: string[];
  goal?: string | null;
  onboardingCompleted?: boolean;
};

export type AiChatResponse = {
  success: boolean;
  message: string;
  domain: string | null;
  secondaryDomains?: string[];
  recommendations: AiRecommendations;
  suggestedQuestions?: string[];
  consultSpecialist?: boolean;
  disclaimer?: string;
  profile?: AiProfileSummary;
  meta?: {
    model?: string;
    sensitive?: boolean;
    candidatesFound?: number;
    recommendations?: number;
    degraded?: boolean;
  };
};

export type AiChatHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export type AiLearnerContext = {
  name?: string;
  domains?: string[];
  interests?: string[];
  goal?: string;
  guidance?: string;
  career?: string;
  education?: string;
};

export type AiChatRequest = {
  message: string;
  history?: AiChatHistoryEntry[];
  context?: AiLearnerContext;
};

/* ------------------------------------------------------------------ *
 * Static UI content
 * ------------------------------------------------------------------ */

export const AI_SUGGESTED_QUESTIONS = [
  "Help me choose a career",
  "I want to start a business",
  "Recommend a specialist",
  "Show me workshops",
];

export const AI_DISCLAIMER_TEXT =
  "Learnova AI Assistant gives AI-assisted guidance only. It is not a human specialist and does not replace a qualified professional.";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Build the optional, non-sensitive learner context sent with each message.
 * The backend still authenticates the learner; this only helps when the
 * browser has onboarding answers that are not stored server-side yet.
 */
export function buildLearnerContext(user?: User | null): AiLearnerContext {
  const onboarding = getOnboarding();

  const context: AiLearnerContext = {};

  if (user?.name) context.name = user.name;

  const domains = Array.from(
    new Set(
      [
        ...(onboarding?.domains || []),
        onboarding?.domain || "",
        user?.domain || "",
      ].filter(Boolean)
    )
  );

  if (domains.length) context.domains = domains;
  if (onboarding?.interests?.length) context.interests = onboarding.interests;
  if (onboarding?.goal) context.goal = onboarding.goal;
  if (onboarding?.guidance) context.guidance = onboarding.guidance;
  if (onboarding?.career) context.career = onboarding.career;
  if (onboarding?.education) context.education = onboarding.education;

  return context;
}

/**
 * Ask the Learnova AI assistant. Errors are thrown with the message returned
 * by the backend so the chat UI can display something meaningful.
 */
export async function askLearnovaAi({
  message,
  history = [],
  user,
}: {
  message: string;
  history?: AiChatHistoryEntry[];
  user?: User | null;
}): Promise<AiChatResponse> {
  return api.aiChat({
    message,
    history: history.slice(-6),
    context: buildLearnerContext(user),
  });
}

export function formatPrice(price?: number | null): string {
  if (typeof price !== "number" || Number.isNaN(price)) return "";

  return `${price.toLocaleString()} FCFA`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function emptyRecommendations(): AiRecommendations {
  return { specialists: [], posts: [], workshops: [] };
}

export function countRecommendations(recommendations?: AiRecommendations | null): number {
  if (!recommendations) return 0;

  return (
    (recommendations.specialists?.length || 0) +
    (recommendations.posts?.length || 0) +
    (recommendations.workshops?.length || 0)
  );
}
