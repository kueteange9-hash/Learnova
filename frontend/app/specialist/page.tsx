"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api, AppointmentRecord, SpecialistProfile } from "@/lib/api";

export default function SpecialistDashboard() {
  const [profile, setProfile] = useState<SpecialistProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [error, setError] = useState("");
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(false);

  useEffect(() => {
    Promise.all([api.getMySpecialistProfile(), api.getAppointments()])
      .then(([p, a]) => {
        setProfile(p.specialist);
        setAppointments(a.appointments);
        if (p.specialist?.verification === "VERIFIED") {
          const localDismissed = typeof window !== "undefined" && localStorage.getItem(`dismissed_approval_${p.specialist.id}`);
          if (!p.specialist.approvalDismissed && !localDismissed) {
            setShowVerifiedBanner(true);
          }
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleDismissApprovalBanner() {
    if (!profile) return;
    setShowVerifiedBanner(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(`dismissed_approval_${profile.id}`, "true");
    }
    try {
      await api.dismissSpecialistApprovalBanner();
    } catch {
      // Ignore API network errors; local dismissal is already preserved
    }
  }

  if (error)
    return (
      <div className="apiState errorState">
        <h2>We could not load your workspace</h2>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    );

  if (!profile) return <div className="apiState">Loading your practice...</div>;

  const isVerified = profile.verification === "VERIFIED";
  const isPending = profile.verification === "PENDING";
  const isRejected = profile.verification === "REJECTED";

  const upcoming = appointments.filter(
    (a) =>
      ["PENDING", "CONFIRMED", "APPROVED"].includes(a.status) &&
      new Date(a.date) >= new Date()
  );
  const pending = upcoming.filter((a) => a.status === "PENDING");
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const completeness = [
    profile.headline,
    profile.user.bio,
    profile.howIHelp,
    profile.experience,
    profile.expertise.length,
    profile.languages.length,
    profile.sessionFormats.length,
    profile.sessionRate !== null,
    profile.availability.length,
  ].filter(Boolean).length;

  const next = upcoming.sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];

  return (
    <div className="learnerPage specialistDashboard">
      <section className="dashboardHello">
        <div>
          <p className="pageKicker">PRACTICE OVERVIEW</p>
          <h1>Good day, {profile.user.name.split(" ")[0]}</h1>
          <p>Manage your practice, qualification documents, and learner sessions.</p>
        </div>
        {isVerified ? (
          <Link href="/specialist/availability" className="learnerPrimary">
            <Icon name="calendar" size={16} /> Add availability
          </Link>
        ) : (
          <button className="learnerPrimary" disabled title="Requires admin approval">
            <Icon name="clock" size={16} /> Verification required
          </button>
        )}
      </section>

      {/* Verification Status Banner */}
      {isPending && (
        <div className="verificationBanner" style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb", padding: "1rem", borderRadius: "8px", margin: "1rem 0", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <Icon name="clock" size={24} />
          <div>
            <b style={{ color: "#b45309", fontSize: "1.05rem" }}>Verification Pending Admin Review</b>
            <p style={{ margin: "0.25rem 0", color: "#78350f" }}>
              Your specialist account is currently in <strong>Pending</strong> status. You can access this dashboard and update your profile details, but specialist activities (publishing community posts, hosting workshops, and opening public booking availability) remain restricted until an administrator reviews and approves your qualification document.
            </p>
            <div style={{ marginTop: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#92400e" }}>
                Document submitted: {profile.verificationDocumentName || "Stored for review"} ·{" "}
              </span>
              <Link href="/specialist/profile" style={{ fontWeight: 600, color: "#b45309", textDecoration: "underline" }}>
                Review / update document
              </Link>
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="verificationBanner" style={{ borderLeft: "4px solid #ef4444", background: "#fef2f2", padding: "1rem", borderRadius: "8px", margin: "1rem 0", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <Icon name="close" size={24} />
          <div>
            <b style={{ color: "#b91c1c", fontSize: "1.05rem" }}>Verification Request Rejected</b>
            <p style={{ margin: "0.25rem 0", color: "#991b1b" }}>
              The administrator reviewed your verification request: {profile.verificationNotes ? `"${profile.verificationNotes}"` : "Please upload a qualifying document to verify your specialist credentials."}
            </p>
            <Link href="/specialist/profile" className="outlineAction compact" style={{ marginTop: "0.5rem", display: "inline-block" }}>
              Upload new qualification document
            </Link>
          </div>
        </div>
      )}

      {isVerified && showVerifiedBanner && (
        <div className="verificationBanner" style={{ borderLeft: "4px solid #10b981", background: "#ecfdf5", padding: "0.85rem 1rem", borderRadius: "8px", margin: "1rem 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Icon name="check" size={20} />
            <div>
              <b style={{ color: "#047857" }}>🎉 Specialist Account Approved!</b>
              <span style={{ marginLeft: "0.5rem", color: "#065f46", fontSize: "0.9rem" }}>
                Your professional profile is verified. You can now publish community posts, host workshops, and accept learner bookings.
              </span>
            </div>
          </div>
          <button
            onClick={handleDismissApprovalBanner}
            style={{ padding: "6px 12px", background: "#047857", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" }}
            title="Dismiss this notification forever"
          >
            Got it (Dismiss)
          </button>
        </div>
      )}

      <section className="learnerStats">
        <div className="statTile">
          <span className="statIcon purple"><Icon name="calendar" /></span>
          <div>
            <strong>{upcoming.length}</strong>
            <p>Upcoming sessions</p>
          </div>
        </div>
        <div className="statTile">
          <span className="statIcon orange"><Icon name="bell" /></span>
          <div>
            <strong>{pending.length}</strong>
            <p>Awaiting response</p>
          </div>
        </div>
        <div className="statTile">
          <span className="statIcon green"><Icon name="check" /></span>
          <div>
            <strong>{completed.length}</strong>
            <p>Completed sessions</p>
          </div>
        </div>
        <div className="statTile">
          <span className="statIcon blue"><Icon name="clock" /></span>
          <div>
            <strong>{profile.availability.filter((x) => !x.booked).length}</strong>
            <p>Open time slots</p>
          </div>
        </div>
      </section>

      <div className="specialistOverviewGrid">
        <section className="panel">
          <div className="panelHeading">
            <div>UP NEXT</div>
            <Link href="/specialist/appointments">
              All appointments <Icon name="arrow" size={14} />
            </Link>
          </div>
          {next ? (
            <div className="specialistNext">
              <div className="appointmentDate">
                <strong>{new Date(next.date).getDate()}</strong>
                <span>
                  {new Date(next.date)
                    .toLocaleDateString("en", { month: "short" })
                    .toUpperCase()}
                </span>
              </div>
              <div className="avatar avatar-blue">
                {next.learner.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <h3>{next.learner.name}</h3>
                <p>
                  {new Date(next.date).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {next.format}
                </p>
                <span className={`appointmentStatus ${next.status.toLowerCase()}`}>
                  {next.status}
                </span>
              </div>
              {next.meetingUrl ? (
                <a
                  href={next.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="learnerPrimary compact"
                >
                  <Icon name="video" size={16} /> Launch call
                </a>
              ) : (
                <Link href="/specialist/appointments" className="outlineAction">
                  Manage
                </Link>
              )}
            </div>
          ) : (
            <div className="emptyCompact">
              <Icon name="calendar" />
              <div>
                <b>No upcoming appointments</b>
                <p>
                  {isVerified
                    ? "Add availability so learners can book a time with you."
                    : "Once verified, you will be able to publish open times for learners."}
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="panel practiceReadiness">
          <div className="panelHeading">
            <div>PROFILE READINESS</div>
            <b>{Math.round((completeness / 9) * 100)}%</b>
          </div>
          <div
            className="readinessRing"
            style={
              {
                "--progress": `${(completeness / 9) * 360}deg`,
              } as React.CSSProperties
            }
          >
            <span>{completeness}/9</span>
          </div>
          <h3>
            {completeness === 9
              ? "Your profile is ready"
              : "Complete your learner-facing profile"}
          </h3>
          <p>Clear details and qualification documents help administrators verify you and learners choose you.</p>
          <Link href="/specialist/profile" className="outlineAction">
            Review profile & credentials
          </Link>
        </aside>
      </div>

      <section>
        <div className="contentHeading">
          <div>
            <h2>Appointment requests</h2>
            <p>Respond promptly so learners can plan with confidence.</p>
          </div>
          <Link href="/specialist/appointments">
            Manage all <Icon name="arrow" size={14} />
          </Link>
        </div>
        <div className="requestList panel">
          {pending.length ? (
            pending.slice(0, 4).map((a) => (
              <article key={a.id}>
                <div className="avatar avatar-gold">{a.learner.name[0]}</div>
                <div>
                  <h3>{a.learner.name}</h3>
                  <p>
                    {new Date(a.date).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {a.format}
                  </p>
                </div>
                <span>{a.notes || "No session context provided"}</span>
                <Link href="/specialist/appointments" className="outlineAction">
                  Respond
                </Link>
              </article>
            ))
          ) : (
            <div className="emptyCompact">
              <Icon name="check" />
              <div>
                <b>You are all caught up</b>
                <p>New booking requests will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
