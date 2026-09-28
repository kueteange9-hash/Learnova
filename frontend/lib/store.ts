export type Role = "learner" | "specialist" | "admin";

export type VerificationDoc = {
  fileName: string;
  fileData?: string;
  fileType?: string;
  uploadedAt: string;
  notes?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  photo?: string;
  domain?: string;
  verified?: boolean;
  bio?: string;
  verificationDocument?: VerificationDoc;
  documentStatus?: "pending" | "approved" | "rejected";
};

export type Post = {
  id: string;
  author: string;
  authorId: string;
  role: "specialist";
  domain: string;
  text: string;
  image?: string;
  likes: number;
  comments: string[];
  shares: number;
  createdAt: string;
};

export type Appointment = {
  id: string;
  learner: string;
  specialist: string;
  specialistId: string;
  date: string;
  time: string;
  type: "Video" | "Chat" | "In-person";
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
};

export type Workshop = {
  id: string;
  title: string;
  specialist: string;
  domain: string;
  date: string;
  price: number;
  description: string;
  status: "Pending" | "Approved" | "Rejected";
};

const defaultUsers: User[] = [
  {
    id: "u1",
    name: "Alex Johnson",
    email: "learner@learnova.test",
    password: "password123",
    role: "learner",
    domain: "Academic Guidance",
  },
  {
    id: "u2",
    name: "Dr. Sarah Williams",
    email: "specialist@learnova.test",
    password: "password123",
    role: "specialist",
    domain: "Career Guidance",
    verified: true,
    documentStatus: "approved",
    bio: "Career and professional development specialist.",
    verificationDocument: {
      fileName: "Dr_Sarah_Williams_Certificate_2025.pdf",
      fileType: "application/pdf",
      uploadedAt: "2026-08-10",
    },
  },
  {
    id: "u3",
    name: "Learnova Admin",
    email: "admin@learnova.com",
    password: "dora",
    role: "admin",
  },
  {
    id: "u4",
    name: "Michael Brown",
    email: "michael@learnova.test",
    password: "password123",
    role: "specialist",
    domain: "Entrepreneurship",
    verified: false,
    documentStatus: "pending",
    bio: "Entrepreneurship mentor and business consultant with 10+ years experience.",
    verificationDocument: {
      fileName: "Michael_Brown_Business_Accreditation.pdf",
      fileType: "application/pdf",
      uploadedAt: "2026-08-24",
    },
  },
];

const defaultPosts: Post[] = [
  {
    id: "p1",
    author: "Dr. Sarah Williams",
    authorId: "u2",
    role: "specialist",
    domain: "Career Guidance",
    text: "5 practical tips for choosing a career path that matches your strengths and long-term goals.",
    likes: 125,
    comments: ["This is very helpful!", "Thank you for sharing."],
    shares: 18,
    createdAt: "2h ago",
  },
  {
    id: "p2",
    author: "Michael Brown",
    authorId: "u4",
    role: "specialist",
    domain: "Entrepreneurship",
    text: "Starting a small project? Begin with the problem you want to solve, not only the product you want to build.",
    likes: 89,
    comments: ["Great advice."],
    shares: 9,
    createdAt: "5h ago",
  },
];

const defaultAppointments: Appointment[] = [
  {
    id: "a1",
    learner: "Alex Johnson",
    specialist: "Dr. Sarah Williams",
    specialistId: "u2",
    date: "2026-08-16",
    time: "14:00",
    type: "Video",
    status: "Confirmed",
  },
];

const defaultWorkshops: Workshop[] = [
  {
    id: "w1",
    title: "How to Build Your Career Plan",
    specialist: "Dr. Sarah Williams",
    domain: "Career Guidance",
    date: "2026-08-22",
    price: 0,
    description:
      "A practical workshop to define your goals and next steps.",
    status: "Approved",
  },
  {
    id: "w2",
    title: "Entrepreneurship Starter Lab",
    specialist: "Michael Brown",
    domain: "Entrepreneurship",
    date: "2026-08-28",
    price: 5000,
    description:
      "Learn how to validate an idea and prepare a simple business plan.",
    status: "Approved",
  },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  localStorage.setItem(key, JSON.stringify(value));
}

export function seedStore() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem("learnova_users")) {
    write("learnova_users", defaultUsers);
  }

  if (!localStorage.getItem("learnova_posts")) {
    write("learnova_posts", defaultPosts);
  }

  if (!localStorage.getItem("learnova_appointments")) {
    write("learnova_appointments", defaultAppointments);
  }

  if (!localStorage.getItem("learnova_workshops")) {
    write("learnova_workshops", defaultWorkshops);
  }
}

export const getUsers = () =>
  read<User[]>("learnova_users", defaultUsers);

export const getPosts = () =>
  read<Post[]>("learnova_posts", defaultPosts);

export const getAppointments = () =>
  read<Appointment[]>(
    "learnova_appointments",
    defaultAppointments
  );

export const getWorkshops = () =>
  read<Workshop[]>(
    "learnova_workshops",
    defaultWorkshops
  );

export function saveUsers(v: User[]) {
  write("learnova_users", v);
}

export function savePosts(v: Post[]) {
  write("learnova_posts", v);
}

export function saveAppointments(v: Appointment[]) {
  write("learnova_appointments", v);
}

export function saveWorkshops(v: Workshop[]) {
  write("learnova_workshops", v);
}

/**
 * Get the currently logged-in user.
 *
 * The main authentication key is now "learnova_user",
 * which is also used by RoleGuard and the login/register pages.
 */
export function currentUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // Main authentication key
    const storedUser = localStorage.getItem("learnova_user");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as User;
      const normalizedRole = parsedUser.role?.toString().toLowerCase();

      if (!["learner", "specialist", "admin"].includes(normalizedRole)) {
        throw new Error("Invalid user role in stored session");
      }

      return {
        ...parsedUser,
        role: normalizedRole as Role,
      };
    }

    // Backward compatibility with the old key
    const oldId = localStorage.getItem("learnova_current_user");

    if (oldId) {
      const user = getUsers().find((u) => u.id === oldId);

      if (user) {
        // Synchronize the old session with the new authentication key
        localStorage.setItem(
          "learnova_user",
          JSON.stringify(user)
        );

        return user;
      }
    }

    return null;
  } catch (error) {
    console.error("Unable to read current user:", error);

    localStorage.removeItem("learnova_user");
    localStorage.removeItem("learnova_current_user");

    return null;
  }
}

type DatabaseAuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  bio?: string | null;
};

export function updateCurrentProfile(user: { id: string; name: string; image: string | null; bio?: string | null }) {
  const current = currentUser();
  if (!current || current.id !== user.id) return;
  localStorage.setItem("learnova_user", JSON.stringify({ ...current, name: user.name, photo: user.image || undefined, bio: user.bio ?? current.bio }));
  window.dispatchEvent(new Event("learnova:profile-updated"));
}

/** Store a user and JWT returned by the PostgreSQL auth API. */
export function setAuthenticatedUser(user: DatabaseAuthUser, token: string) {
  if (typeof window === "undefined") return;

  const role = user.role.toLowerCase();

  if (!["learner", "specialist", "admin"].includes(role)) {
    throw new Error("The server returned an invalid user role");
  }

  const sessionUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role as Role,
    photo: user.image || undefined,
    bio: user.bio || undefined,
  };

  localStorage.setItem("learnova_user", JSON.stringify(sessionUser));
  localStorage.setItem("learnova_current_user", sessionUser.id);
  localStorage.setItem("learnova_token", token);
}

/**
 * Set the currently logged-in user.
 *
 * Both keys are synchronized so existing Learnova
 * components continue to work.
 */
export function setCurrentUser(id: string) {
  if (typeof window === "undefined") return;

  const user = getUsers().find((u) => u.id === id);

  if (!user) {
    console.error("Cannot set current user: user not found:", id);
    return;
  }

  // Main authentication state
  localStorage.setItem(
    "learnova_user",
    JSON.stringify(user)
  );

  // Keep the legacy key synchronized
  localStorage.setItem("learnova_current_user", id);
}

/**
 * Log out the current user completely.
 */
export function logout() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("learnova_user");
  localStorage.removeItem("learnova_current_user");
  localStorage.removeItem("learnova_token");

  window.location.href = "/";
}
