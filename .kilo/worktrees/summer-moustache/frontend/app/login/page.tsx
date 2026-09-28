"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { setCurrentUser } from "@/lib/store";

type Role = "learner" | "specialist" | "admin";

export default function Login() {
  const [role, setRole] = useState<Role>("learner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const loginData = {
        email: email.trim().toLowerCase(),
        password,
        role: role.toUpperCase(),
      };

      console.log("LOGIN DATA:", loginData);

      const result = await api.login(loginData);

      console.log("LOGIN RESULT:", result);

      if (!result || !result.success) {
        setError(
          result?.message || "Invalid email, password, or account type."
        );
        setLoading(false);
        return;
      }

      // Save the logged-in user locally
      setCurrentUser(result.user.id);

      // Store JWT token
      if (result.token) {
        localStorage.setItem("learnova_token", result.token);
      }

      // Store user information
      localStorage.setItem(
        "learnova_user",
        JSON.stringify(result.user)
      );

      // Redirect according to role
      if (result.user.role === "ADMIN") {
        window.location.href = "/admin";
      } else if (result.user.role === "SPECIALIST") {
        window.location.href = "/specialist";
      } else {
        window.location.href = "/learner";
      }
    } catch (err) {
      console.error("Login error:", err);

      // Show the actual error returned by the API
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the Learnova server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <Link className="brand center" href="/">
          <span className="brandMark">L</span>
          Learnova
        </Link>

        <h1>Welcome back</h1>
        <p>Sign in to your secure Learnova portal.</p>

        <div className="roleTabs">
          <button
            type="button"
            className={role === "learner" ? "selected" : ""}
            onClick={() => {
              setRole("learner");
              setError("");
            }}
          >
            🎓 Learner
          </button>

          <button
            type="button"
            className={role === "specialist" ? "selected" : ""}
            onClick={() => {
              setRole("specialist");
              setError("");
            }}
          >
            🧑🏾‍🏫 Specialist
          </button>

          <button
            type="button"
            className={role === "admin" ? "selected" : ""}
            onClick={() => {
              setRole("admin");
              setError("");
            }}
          >
            🛡️ Admin
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
            Email Address

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                role === "admin"
                  ? "admin@learnova.com"
                  : role === "specialist"
                    ? "specialist@example.com"
                    : "learner@example.com"
              }
            />
          </label>

          <label>
            Password

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="primaryButton full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <p style={{ marginTop: "12px" }}>
          Don't have an account?{" "}
          <Link
            href="/register"
            style={{
              color: "var(--primary)",
              fontWeight: 700,
            }}
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
