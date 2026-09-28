"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import Icon from "@/components/learner/Icon";
import { api } from "@/lib/api";
import { currentUser } from "@/lib/store";

export default function SupportPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("General");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const u = currentUser();
    if (u) {
      setUser(u);
      setName(u.name || "");
      setEmail(u.email || "");
    }
  }, []);

  const userRole = user?.role?.toString().toUpperCase();
  const dashboardUrl = userRole === "ADMIN" ? "/admin" : userRole === "SPECIALIST" ? "/specialist" : userRole === "LEARNER" ? "/learner" : "/";
  const dashboardLabel = userRole === "ADMIN" ? "Admin Console" : userRole === "SPECIALIST" ? "Specialist Workspace" : userRole === "LEARNER" ? "Learner Dashboard" : "Home";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!subject.trim()) {
      setError("Please enter a subject line.");
      return;
    }
    if (!message.trim()) {
      setError("Please write your message or feedback.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address so we can respond to you.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitSupportFeedback({
        name: name.trim(),
        email: email.trim(),
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess(res.message || "Your message has been sent successfully. Our team will get back to you soon!");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Failed to submit support request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="learnerPage" style={{ maxWidth: "900px", margin: "32px auto", padding: "0 20px" }}>
        {/* Navigation back to Dashboard */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <Link
            href={dashboardUrl}
            className="backAction"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "var(--primary-light)",
            }}
          >
            ← Back to {dashboardLabel}
          </Link>

          <Link href={dashboardUrl} className="outlineAction compact" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Icon name="home" size={15} /> Dashboard Home
          </Link>
        </div>

        <section className="pageTitle" style={{ marginBottom: "24px" }}>
          <div>
            <p className="pageKicker" style={{ color: "var(--primary)", fontWeight: "800", fontSize: "0.85rem", letterSpacing: "1px" }}>
              HERE TO HELP YOU
            </p>
            <h1 style={{ fontSize: "2.2rem", fontWeight: "900", margin: "6px 0 10px" }}>Help & Support</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>
              Have a question, feedback, or need technical assistance? Send us a message and return to your dashboard anytime.
            </p>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: "24px" }}>
          <Card>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "800", marginBottom: "6px" }}>Submit Feedback / Request Support</h2>
            <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "20px" }}>
              Fill out the form below and we will answer as quickly as possible.
            </p>

            {error && (
              <div className="formAlert error" role="alert" style={{ marginBottom: "16px" }}>
                <Icon name="close" size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="formAlert success" role="alert" style={{ marginBottom: "16px", display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="check" size={16} />
                  <span>{success}</span>
                </div>
                <div>
                  <Link href={dashboardUrl} className="learnerPrimary compact" style={{ display: "inline-flex", gap: "6px" }}>
                    <Icon name="arrow" size={14} /> Return to {dashboardLabel}
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <label style={{ display: "grid", gap: "6px", fontWeight: "600", fontSize: "0.9rem" }}>
                  Your Name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    style={{ padding: "11px 14px", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px", fontWeight: "600", fontSize: "0.9rem" }}>
                  Your Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    style={{ padding: "11px 14px", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: "6px", fontWeight: "600", fontSize: "0.9rem" }}>
                Topic / Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: "11px 14px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "#fff" }}
                >
                  <option value="General">General Inquiry</option>
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Feedback">Feedback & Suggestion</option>
                  <option value="Billing / Account">Billing & Account</option>
                  <option value="Specialist Verification">Specialist Verification</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: "6px", fontWeight: "600", fontSize: "0.9rem" }}>
                Subject
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your inquiry"
                  required
                  style={{ padding: "11px 14px", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontWeight: "600", fontSize: "0.9rem" }}>
                Message
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide any details, feedback, or description of the issue..."
                  required
                  rows={5}
                  style={{ padding: "11px 14px", border: "1px solid var(--border-color)", borderRadius: "8px", resize: "vertical" }}
                />
              </label>

              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" className="primaryButton" disabled={submitting} style={{ flex: 1, justifyContent: "center" }}>
                  {submitting ? "Sending..." : "Submit Support Request"}
                </button>
                <Link href={dashboardUrl} className="outlineAction" style={{ whiteSpace: "nowrap" }}>
                  Back to Dashboard
                </Link>
              </div>
            </form>
          </Card>

          <aside style={{ display: "grid", gap: "16px", alignContent: "start" }}>
            {/* Dashboard Navigation Tile */}
            <div style={{ background: "linear-gradient(135deg, #7c3aed 0%, #581c87 100%)", color: "#ffffff", padding: "20px", borderRadius: "16px", display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="home" size={20} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: "800", margin: 0, color: "#ffffff" }}>
                  Return to Dashboard
                </h3>
              </div>
              <p style={{ fontSize: "0.85rem", margin: 0, opacity: 0.9, lineHeight: "1.5" }}>
                Finished sending your feedback? Jump straight back to your active sessions and platform dashboard.
              </p>
              <Link
                href={dashboardUrl}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "#7c3aed",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  textDecoration: "none",
                  marginTop: "6px",
                }}
              >
                Go to {dashboardLabel} →
              </Link>
            </div>

            <div style={{ background: "var(--primary-light)", borderColor: "#ddd6fe", padding: "20px", borderRadius: "16px", border: "1px solid #ddd6fe" }}>
              <h3 style={{ color: "var(--primary)", fontSize: "1.1rem", fontWeight: "800", marginBottom: "8px" }}>
                Quick Assistance
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: "1.6" }}>
                Looking for answers right away?
              </p>
              <ul style={{ fontSize: "0.85rem", paddingLeft: "18px", marginTop: "10px", display: "grid", gap: "8px", color: "var(--text-muted)" }}>
                <li>How do I book a session with a specialist?</li>
                <li>How do specialist verifications work?</li>
                <li>How can I change my password?</li>
              </ul>
            </div>

            <Card>
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "6px" }}>Direct Email</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                You can also email our support desk directly at:
              </p>
              <a href="mailto:support@learnova.com" style={{ color: "var(--primary)", fontWeight: "700", fontSize: "0.9rem", display: "inline-block", marginTop: "4px" }}>
                support@learnova.com
              </a>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
