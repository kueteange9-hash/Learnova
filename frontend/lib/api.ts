// API client for Learnova PostgreSQL Backend

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "/api";
const DIRECT_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : "http://127.0.0.1:3001/api");

export type ApiRole = "LEARNER" | "SPECIALIST" | "ADMIN";
export type LearnerPreferences = { interests: string[]; goals: string[]; formats: string[]; stage: string; aspiration: string; completedAt: string | null };
export type LearnerPreferenceOptions = { interests: string[]; goals: string[]; formats: string[]; stage: string[] };
export type ChatMessage = { id: string; senderId: string; recipientId: string; text: string; read: boolean; createdAt: string };
export type ChatContact = { id: string; name: string; image: string | null; role: ApiRole; unread: number; lastMessage: ChatMessage | null };

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  image: string | null;
  bio: string | null;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
  role: "LEARNER" | "SPECIALIST";
  domain?: string;
  bio?: string;
  verificationDocument?: File;
};

export type LoginData = {
  email: string;
  password: string;
  role?: ApiRole;
};

export type AvailabilitySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  booked: boolean;
};

export type SpecialistProfile = {
  id: string;
  userId: string;
  domain: string;
  headline: string | null;
  qualification: string | null;
  experience: string | null;
  howIHelp: string | null;
  expertise: string[];
  expertiseDescriptions: string[];
  languages: string[];
  sessionFormats: string[];
  sessionRate: number | null;
  sessionDuration: number;
  verification: "PENDING" | "VERIFIED" | "REJECTED";
  verificationDocument: string | null;
  verificationDocumentName: string | null;
  verificationDocumentType: string | null;
  verificationSubmittedAt: string | null;
  verificationNotes: string | null;
  approvalDismissed?: boolean;
  completedSessions?: number;
  user: { id: string; name: string; email: string; image: string | null; bio: string | null; createdAt?: string };
  availability: AvailabilitySlot[];
};

export type RecommendedSpecialist = SpecialistProfile & {
  matchScore: number;
  matchReason: string;
  matchBadges: string[];
};

export type SupportTicketRecord = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  user?: { id: string; name: string; email: string; role: ApiRole; image: string | null };
};

export type AppointmentRecord = {
  id: string;
  date: string;
  endDate: string | null;
  format: string;
  status: "PENDING" | "CONFIRMED" | "APPROVED" | "CANCELLED" | "COMPLETED";
  notes: string | null;
  specialistNotes: string | null;
  meetingUrl: string | null;
  learner: { id: string; name: string; email: string; image: string | null };
  specialist: { id: string; name: string; email: string; image: string | null; specialist?: { headline: string | null; domain: string } };
  availabilitySlot: AvailabilitySlot | null;
};

export type WorkshopRegistrationSummary = {
  id: string;
  learnerId: string;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string;
  learner: { id: string; name: string; email: string; image: string | null };
};

export type WorkshopRecord = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  type: "FREE" | "PAID";
  price: number | null;
  date: string;
  meetingUrl: string | null;
  registrations?: WorkshopRegistrationSummary[];
  specialist: { id: string; name: string; email: string; image: string | null };
};

export type CommunityPostRecord = {
  id: string; domain: string; text: string; image: string | null; shares: number; createdAt: string;
  author: { id: string; name: string; email: string; image: string | null; specialist?: { headline: string | null; verification: string } | null };
  likes: { id: string; userId: string }[];
  comments: { id: string; text: string; createdAt: string; author: { id: string; name: string; image: string | null } }[];
};

export type NotificationRecord = { id: string; title: string; message: string; read: boolean; createdAt: string };

export type DomainItem = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("learnova_token") : null;
  const isFormData = options.body instanceof FormData;
  const requestBase = isFormData ? DIRECT_API_BASE : API_BASE;
  const headers = new Headers(options.headers);
  if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  const requestSignal = options.signal || AbortSignal.timeout(isFormData ? 120000 : 20000);
  let res: Response;
  try {
    res = await fetch(`${requestBase}${endpoint}`, {
      ...options, headers, signal: requestSignal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("We couldn't reach Learnova. Check your connection and try again.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      (res.status >= 500 ? "Learnova is temporarily unavailable. Please try again shortly." : `Request failed with status ${res.status}`)
    );
  }

  if (data === null) throw new Error("Learnova returned an unexpected response. Please try again.");
  return data;
}

export const api = {
  getLearnerPreferences: () => apiRequest<{ profile: LearnerPreferences | null; options: LearnerPreferenceOptions }>("/learners/me/preferences"),
  saveLearnerPreferences: (data: Omit<LearnerPreferences, "completedAt"> & { complete: boolean }) => apiRequest<{ profile: LearnerPreferences }>("/learners/me/preferences", { method: "PUT", body: JSON.stringify(data) }),
  getRecommendedSpecialists: () => apiRequest<{ success: boolean; learnerProfile: LearnerPreferences | null; recommendations: RecommendedSpecialist[] }>("/learners/me/recommendations"),
  getFollowing: () => apiRequest<{ specialistIds: string[] }>("/follows"),
  setSpecialistFollow: (id: string, following: boolean) => apiRequest<{ following: boolean }>(`/follows/${encodeURIComponent(id)}`, { method: following ? "PUT" : "DELETE" }),
  getChatContacts: () => apiRequest<{ contacts: ChatContact[] }>("/messages/contacts"),
  getMessages: (id: string, before?: string) => apiRequest<{ messages: ChatMessage[]; hasMore: boolean }>(`/messages/${encodeURIComponent(id)}${before ? `?before=${encodeURIComponent(before)}` : ""}`),
  sendMessage: (id: string, text: string) => apiRequest<{ message: ChatMessage }>(`/messages/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ text }) }),
  readMessages: (id: string, ids: string[]) => apiRequest<{ success: boolean }>(`/messages/${encodeURIComponent(id)}/read`, { method: "PATCH", body: JSON.stringify({ ids }) }),
  uploadProfilePhoto: (photo: File) => {
    const body = new FormData();
    body.append("photo", photo);
    return apiRequest<{ success: boolean; user: SpecialistProfile["user"] }>("/specialists/me/photo", { method: "POST", body });
  },
  chatWithAI: (messages: { role: "user" | "assistant"; text: string }[]) =>
    apiRequest<{ success: boolean; text: string }>("/ai/chat", { method: "POST", body: JSON.stringify({ messages }) }),
  // Auth
  register: (data: RegisterData) => {
    if (data.role !== "SPECIALIST") {
      const { verificationDocument: _unused, ...jsonData } = data;
      return apiRequest<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(jsonData) });
    }
    const body = new FormData();
    Object.entries(data).forEach(([key, value]) => { if (value !== undefined) body.append(key, value instanceof File ? value : String(value)); });
    return apiRequest<AuthResponse>("/auth/register", { method: "POST", body });
  },

  login: (data: LoginData) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Specialists
  getSpecialists: (domain?: string) =>
    apiRequest<{ success: boolean; specialists: SpecialistProfile[] }>(
      `/specialists${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`
    ),

  getSpecialist: (userId: string) =>
    apiRequest<{ success: boolean; specialist: SpecialistProfile }>(`/specialists/${userId}`),

  getMySpecialistProfile: () =>
    apiRequest<{ success: boolean; specialist: SpecialistProfile }>("/specialists/me"),

  updateMySpecialistProfile: (data: Record<string, unknown>) =>
    apiRequest<{ success: boolean; message: string; specialist: SpecialistProfile }>("/specialists/me", { method: "PATCH", body: JSON.stringify(data) }),

  addAvailability: (startsAt: string, endsAt: string) =>
    apiRequest<{ success: boolean; slot: AvailabilitySlot }>("/specialists/me/availability", { method: "POST", body: JSON.stringify({ startsAt, endsAt }) }),

  removeAvailability: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(`/specialists/me/availability/${id}`, { method: "DELETE" }),

  uploadVerificationDocument: (document: File) => {
    const body = new FormData(); body.append("document", document);
    return apiRequest<{ success: boolean; message: string }>("/specialists/me/verification-document", { method: "POST", body });
  },

  // Domains
  getDomains: () => apiRequest<{ success: boolean; domains: DomainItem[] }>("/domains"),

  // Admin Management
  getAdminOverview: () => apiRequest<{ success: boolean; metrics: Record<string, number>; recentApplications: SpecialistProfile[] }>("/admin/overview"),
  getAdminSpecialists: (status = "ALL") => apiRequest<{ success: boolean; specialists: SpecialistProfile[] }>(`/admin/specialists?status=${status}`),
  reviewSpecialist: (id: string, decision: "VERIFIED" | "REJECTED", notes?: string) => apiRequest<{ success: boolean; message: string; specialist: SpecialistProfile }>(`/admin/specialists/${id}/verification`, { method: "PATCH", body: JSON.stringify({ decision, notes }) }),
  getAdminUsers: () => apiRequest<{ success: boolean; users: { id:string;name:string;email:string;role:string;image:string|null;createdAt:string;specialist?:{verification:string;domain:string} }[] }>("/admin/users"),
  deleteAdminUser: (id: string) => apiRequest<{ success: boolean; message: string }>(`/admin/users/${id}`, { method: "DELETE" }),

  getAdminDomains: () => apiRequest<{ success: boolean; domains: DomainItem[] }>("/admin/domains"),
  createAdminDomain: (data: { name: string; description?: string; icon?: string }) =>
    apiRequest<{ success: boolean; message: string; domain: DomainItem }>("/admin/domains", { method: "POST", body: JSON.stringify(data) }),
  updateAdminDomain: (id: string, data: { name?: string; description?: string; icon?: string }) =>
    apiRequest<{ success: boolean; message: string; domain: DomainItem }>(`/admin/domains/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAdminDomain: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(`/admin/domains/${id}`, { method: "DELETE" }),

  getAdminPosts: () => apiRequest<{ success: boolean; posts: any[] }>("/admin/posts"),
  deleteAdminPost: (id: string) => apiRequest<{ success: boolean; message: string }>(`/admin/posts/${id}`, { method: "DELETE" }),

  getAdminWorkshops: () => apiRequest<{ success: boolean; workshops: any[] }>("/admin/workshops"),
  deleteAdminWorkshop: (id: string) => apiRequest<{ success: boolean; message: string }>(`/admin/workshops/${id}`, { method: "DELETE" }),

  getAdminAppointments: () => apiRequest<{ success: boolean; appointments: any[] }>("/admin/appointments"),
  updateAdminAppointment: (id: string, data: { status: string }) =>
    apiRequest<{ success: boolean; message: string; appointment: any }>(`/admin/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getAdminPayments: () => apiRequest<{ success: boolean; payments: any[]; registrations: any[] }>("/admin/payments"),

  // Appointments
  getAppointments: () =>
    apiRequest<{ success: boolean; appointments: AppointmentRecord[] }>("/appointments"),

  createAppointment: (data: { specialistId: string; slotId?: string; requestedDate?: string; notes?: string; format?: string }) =>
    apiRequest<{ success: boolean; message: string; appointment: AppointmentRecord }>("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAppointment: (id: string, data: { status?: string; meetingUrl?: string; specialistNotes?: string }) =>
    apiRequest<{ success: boolean; appointment: AppointmentRecord }>(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getWorkshops: () =>
    apiRequest<{ success: boolean; workshops: WorkshopRecord[] }>("/workshops"),

  getMyWorkshops: () =>
    apiRequest<{ success: boolean; workshops: WorkshopRecord[] }>("/workshops/mine"),
  getMyRegisteredWorkshops: () =>
    apiRequest<{ success: boolean; workshops: WorkshopRecord[] }> ("/workshops/registered"),

  registerForWorkshop: (id: string, paymentMethod: "MOMO" | "OM" = "MOMO", phone?: string) =>
    apiRequest<{ success: boolean; message: string; registration: { id: string; workshopId: string; learnerId: string; paymentMethod: string | null; paymentStatus: string; status: string; createdAt: string } }>(`/workshops/${id}/register`, { method: "POST", body: JSON.stringify({ paymentMethod, phone }) }),

  updateWorkshopMeetingUrl: (id: string, meetingUrl: string) =>
    apiRequest<{ success: boolean; message: string; workshop: WorkshopRecord }>(`/workshops/${id}`, { method: "PATCH", body: JSON.stringify({ meetingUrl }) }),

  updateWorkshop: (id: string, data: FormData) =>
    apiRequest<{ success: boolean; message: string; workshop: WorkshopRecord }>(`/workshops/${id}`, { method: "PATCH", body: data }),

  getWorkshopRegistrations: (id: string) =>
    apiRequest<{ success: boolean; registrations: WorkshopRegistrationSummary[] }>(`/workshops/${id}/registrations`),
  createWorkshop: (data: FormData) =>
    apiRequest<{ success: boolean; message: string; workshop: WorkshopRecord }>("/workshops", { method: "POST", body: data }),

  deleteWorkshop: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(`/workshops/${id}`, { method: "DELETE" }),

  getPosts: () => apiRequest<{ success: boolean; posts: CommunityPostRecord[] }>("/posts"),
  createPost: (data: FormData) => apiRequest<{ success: boolean; post: CommunityPostRecord }>("/posts", { method: "POST", body: data }),
  togglePostLike: (id: string) => apiRequest<{ success: boolean; liked: boolean; likes: number }>(`/posts/${id}/like`, { method: "POST" }),
  addPostComment: (id: string, text: string) => apiRequest<{ success: boolean; comment: CommunityPostRecord["comments"][number] }>(`/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }),

  getNotifications: () => apiRequest<{ success: boolean; notifications: NotificationRecord[] }>("/notifications"),
  readNotification: (id: string) => apiRequest<{ success: boolean }>(`/notifications/${id}/read`, { method: "PATCH" }),
  readAllNotifications: () => apiRequest<{ success: boolean }>("/notifications/read", { method: "PATCH" }),

  // Change Password
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ success: boolean; message: string }>("/auth/change-password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),

  // Help & Support / Feedback
  submitSupportFeedback: (data: { name?: string; email?: string; subject: string; message: string; category?: string }) =>
    apiRequest<{ success: boolean; message: string; ticket: SupportTicketRecord }>("/support", { method: "POST", body: JSON.stringify(data) }),

  getAdminSupportTickets: () =>
    apiRequest<{ success: boolean; tickets: SupportTicketRecord[] }>("/support"),

  updateAdminSupportTicketStatus: (id: string, status: "OPEN" | "IN_PROGRESS" | "RESOLVED") =>
    apiRequest<{ success: boolean; message: string; ticket: SupportTicketRecord }>(`/support/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Specialist Approval Dismissal
  dismissSpecialistApprovalBanner: () =>
    apiRequest<{ success: boolean; message: string }>("/specialists/me/dismiss-approval", { method: "PATCH" }),
};

