// API client for the Learnova Express + PostgreSQL backend
//
// All browser calls go through the Next.js rewrite `/api/backend/*`
// (see next.config.js) so the app also works when it is not opened from
// the same machine as the API. Set NEXT_PUBLIC_API_URL in frontend/.env.local
// to bypass the proxy (e.g. NEXT_PUBLIC_API_URL=http://localhost:3001/api).

import type { AiChatRequest, AiChatResponse } from "./ai";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

const TOKEN_KEY = "learnova_token";

/** Base URL used for backend-hosted images (workshops, profile photos). */
const MEDIA_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
  : "";

/** Read the Learnova JWT stored at login (never a Gemini key). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;

  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* ignore storage errors (private mode) */
  }
}

/**
 * Resolve a media path returned by the backend ("/uploads/xyz.png")
 * into something the browser can load.
 */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;

  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }

  if (path.startsWith("/")) {
    return MEDIA_BASE ? `${MEDIA_BASE}${path}` : path;
  }

  return path;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(
      data?.message ||
      data?.error ||
      `Request failed with status ${res.status}`
    ) as Error & { status?: number; code?: string };

    error.status = res.status;
    error.code = data?.code;

    throw error;
  }

  return data as T;
}

export const api = {
  // Auth
  register: (data: any) =>
    apiRequest<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: any) =>
    apiRequest<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Specialists
  getSpecialists: (domain?: string) =>
    apiRequest<any>(
      `/specialists${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`
    ),

  getSpecialist: (id: string): Promise<any> =>
    apiRequest(`/specialists/${encodeURIComponent(id)}`),

  getPendingSpecialists: () =>
    apiRequest<any>("/admin/pending-specialists"),

  verifySpecialist: (specialistId: string, approve: boolean) =>
    apiRequest<any>("/admin/verify-specialist", {
      method: "POST",
      body: JSON.stringify({
        specialistId,
        approve,
      }),
    }),

  // Posts & workshops (used by the AI recommendation pages)
  getPost: (id: string): Promise<any> =>
    apiRequest(`/posts/${encodeURIComponent(id)}`),

  getWorkshop: (id: string): Promise<any> =>
    apiRequest(`/workshops/${encodeURIComponent(id)}`),

  getWorkshops: (): Promise<any> =>
    apiRequest("/workshops"),

  // Appointments
  getAppointments: (userId?: string) =>
    apiRequest<any>(
      `/appointments${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`
    ),

  createAppointment: (data: any) =>
    apiRequest<any>("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ==========================================================
  // Learnova AI Guidance Chat (Google Gemini, backend only)
  // ==========================================================

  /** POST /api/ai/chat — authenticated learner guidance + recommendations. */
  aiChat: (payload: AiChatRequest) =>
    apiRequest<AiChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /** GET /api/ai/health — is the Gemini integration configured? */
  aiHealth: () => apiRequest<any>("/ai/health"),

  // ==========================================================
  // Learner onboarding (persisted for AI personalisation)
  // ==========================================================

  saveOnboarding: (data: {
    domains?: string[];
    interests?: string[];
    goal?: string;
    guidance?: string;
    career?: string;
    education?: string;
  }) =>
    apiRequest("/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyOnboarding: () => apiRequest<any>("/onboarding/me"),
};
