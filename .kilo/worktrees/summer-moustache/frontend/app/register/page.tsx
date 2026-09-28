"use client";

import { useState } from "react";
import Link from "next/link";
import { api, setToken } from "@/lib/api";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  Role,
  VerificationDoc,
} from "@/lib/store";

/**
 * Learners also get a real account on the Express + PostgreSQL backend so the
 * Learnova AI Guidance Chat can authenticate them (POST /api/ai/chat).
 * If the backend is offline (or the email already exists there) the existing
 * local Learnova session keeps working unchanged.
 */
async function provisionBackendAccount(account: {
  name: string;
  email: string;
  password?: string;
}) {
  if (!account.password) return;

  try {
    const created: any = await api.register({
      name: account.name,
      email: account.email,
      password: account.password,
      role: "LEARNER",
    });

    if (created?.token) setToken(created.token);
  } catch {
    try {
      const loggedIn: any = await api.login({
        email: account.email,
        password: account.password,
        role: "LEARNER",
      });

      if (loggedIn?.token) setToken(loggedIn.token);
    } catch (error) {
      console.warn(
        "Learnova backend account could not be created (API offline or account already exists)."
      );
    }
  }
}

export default function Register() {
  const [role, setRole] = useState<"learner" | "specialist">("learner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState("Career Guidance");
  const [bio, setBio] = useState("");
  const [docFile, setDocFile] = useState<VerificationDoc | null>(null);
  const [error, setError] = useState("");

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setDocFile({
        fileName: file.name,
        fileData: String(reader.result),
        fileType: file.type || "application/pdf",
        uploadedAt: new Date().toISOString().split("T")[0],
      });
    };

    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (role === "specialist" && !docFile) {
      setError(
        "Please upload your professional verification document (degree, certificate, or license)."
      );
      return;
    }

    const users = getUsers();

    const normalizedEmail = email.trim().toLowerCase();

    const existing = users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (existing) {
      setError("An account with this email address already exists.");
      return;
    }

    const u = {
      id: "u" + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role as Role,
      domain:
        role === "specialist"
          ? domain
          : "Academic Guidance",
      bio:
        role === "specialist"
          ? bio
          : undefined,
      verified:
        role === "specialist"
          ? false
          : true,
      documentStatus:
        role === "specialist"
          ? ("pending" as const)
          : undefined,
      verificationDocument:
        role === "specialist" && docFile
          ? docFile
          : undefined,
    };

    // Save the new account
    const updatedUsers = [...users, u];
    saveUsers(updatedUsers);

    // Keep the existing Learnova store session
    setCurrentUser(u.id);

    // IMPORTANT:
    // RoleGuard uses "learnova_user", so save the
    // newly created user there too.
    localStorage.setItem(
      "learnova_user",
      JSON.stringify(u)
    );

    if (role === "specialist") {
      alert(
        "Registration submitted! Your specialist account is pending verification by our admin team."
      );

      window.location.href = "/specialist";
    } else {
      // Create the matching PostgreSQL account (needed by the AI guidance chat).
      await provisionBackendAccount(u);

      window.location.href = "/onboarding";
    }
  }

  return (
    <main className="authPage">
      <div
        className={`authCard ${
          role === "specialist" ? "wide" : ""
        }`}
      >
        <Link className="brand center" href="/">
          <span className="brandMark">L</span>
          Learnova
        </Link>

        <h1>Create your account</h1>

        <p>
          Join Learnova as a learner or an accredited specialist.
        </p>

        <div className="roleTabs">
          <button
            type="button"
            className={
              role === "learner" ? "selected" : ""
            }
            onClick={() => {
              setRole("learner");
              setError("");
            }}
          >
            🎓 Learner
          </button>

          <button
            type="button"
            className={
              role === "specialist" ? "selected" : ""
            }
            onClick={() => {
              setRole("specialist");
              setError("");
            }}
          >
            🧑🏾‍🏫 Specialist (Requires Validation)
          </button>
        </div>

        {error && (
          <div
            className="status danger"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "10px",
            }}
          >
            ⚠ {error}
          </div>
        )}

        <form onSubmit={submit}>
          <label>
            Full Name

            <input
              required
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="e.g. Dr. Alex Johnson"
            />
          </label>

          <label>
            Email Address

            <input
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password

            <input
              type="password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Create a secure password"
            />
          </label>

          {role === "specialist" && (
            <>
              <label>
                Area of Specialization

                <select
                  value={domain}
                  onChange={(e) =>
                    setDomain(e.target.value)
                  }
                >
                  <option>Career Guidance</option>
                  <option>Academic Guidance</option>
                  <option>Mental Wellbeing</option>
                  <option>Entrepreneurship</option>
                  <option>Agriculture</option>
                  <option>Personal Development</option>
                </select>
              </label>

              <label>
                Professional Bio & Qualifications

                <textarea
                  value={bio}
                  onChange={(e) =>
                    setBio(e.target.value)
                  }
                  placeholder="Describe your background, years of experience, and credentials..."
                  rows={3}
                />
              </label>

              <div
                className="card"
                style={{
                  background:
                    "var(--bg-card-subtle)",
                  padding: "18px",
                  border:
                    "1px dashed var(--primary)",
                }}
              >
                <span
                  className="eyebrow"
                  style={{
                    marginBottom: "8px",
                  }}
                >
                  🛡️ Admin Verification Document
                </span>

                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Upload your diploma, certification,
                  or professional license. Our admin
                  team will inspect this document to
                  validate your profile.
                </p>

                <label
                  className="secondaryButton"
                  style={{
                    cursor: "pointer",
                    width: "fit-content",
                  }}
                >
                  📄{" "}
                  {docFile
                    ? "Change Document"
                    : "Upload Document (PDF, JPG, PNG)"}

                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    hidden
                    onChange={handleFileUpload}
                  />
                </label>

                {docFile && (
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "13px",
                      color: "var(--success)",
                      fontWeight: 700,
                    }}
                  >
                    ✓ Attached:{" "}
                    <b>{docFile.fileName}</b>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            className="primaryButton full"
            style={{ marginTop: "10px" }}
          >
            {role === "specialist"
              ? "Submit Specialist Application →"
              : "Create Account →"}
          </button>
        </form>

        <p
          style={{
            marginTop: "12px",
            textAlign: "center",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--primary)",
              fontWeight: 700,
            }}
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
