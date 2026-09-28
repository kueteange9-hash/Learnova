"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import RoleGuard from "@/components/RoleGuard";
import {
  getUsers,
  getPosts,
  getWorkshops,
  getAppointments,
  User,
  saveUsers,
} from "@/lib/store";

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [workshopsCount, setWorkshopsCount] = useState(0);
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUsers(getUsers());
    setAppointmentCount(getAppointments().length);
    setPostCount(getPosts().length);
    setWorkshopsCount(getWorkshops().length);
    setMounted(true);
  }, []);

  const specialists = users.filter((u) => u.role === "specialist");
  const pending = specialists.filter(
    (s) => !s.verified || s.documentStatus === "pending"
  );

  function validateSpecialist(id: string, approve: boolean) {
    const updated = users.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          verified: approve,
          documentStatus: approve
            ? ("approved" as const)
            : ("rejected" as const),
        };
      }
      return u;
    });

    saveUsers(updated);
    setUsers(updated);
    setInspectUser(null);

    alert(
      approve
        ? "Specialist verified and approved successfully!"
        : "Specialist verification application rejected."
    );
  }

  return (
    <RoleGuard role="admin">
      <Nav />

      <main className="dashboard">
        <div className="welcome">
          <div>
            <span className="eyebrow">Administration Portal</span>
            <h1>Platform Overview</h1>
            <p>
              Audit specialist credentials, manage platform verification, and
              monitor activity.
            </p>
          </div>
        </div>

        <div className="metricGrid">
          <Metric
            n={users.filter((u) => u.role === "learner").length}
            t="Active Learners"
          />

          <Metric
            n={specialists.length}
            t="Total Specialists"
          />

          <Metric
            n={pending.length}
            t="Pending Document Verifications"
          />

          <Metric
            n={appointmentCount}
            t="Total Appointments"
          />
        </div>

        <div className="dashboardGrid">
          <section>
            <Card>
              <div className="sectionHead">
                <div>
                  <h2>Specialist Document Verification</h2>

                  <span
                    className="muted"
                    style={{ fontSize: "13px" }}
                  >
                    Audit submitted credentials and accreditations before
                    publishing.
                  </span>
                </div>

                <span className="badge">
                  {pending.length} pending audit
                </span>
              </div>

              {specialists.length ? (
                specialists.map((s) => (
                  <div className="adminRow" key={s.id}>
                    <div className="avatar">
                      {s.photo ? (
                        <img src={s.photo} alt={s.name} />
                      ) : (
                        s.name[0]
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <b>{s.name}</b>

                      <small style={{ display: "block" }}>
                        {s.domain} · {s.email}
                      </small>

                      {s.bio && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            marginTop: "4px",
                            maxWidth: "450px",
                          }}
                        >
                          {s.bio}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        className={
                          s.verified
                            ? "status good"
                            : "status pending"
                        }
                      >
                        {s.verified
                          ? "✓ Verified"
                          : s.documentStatus === "rejected"
                          ? "✕ Rejected"
                          : "⏳ Pending"}
                      </span>

                      {s.verificationDocument && (
                        <button
                          type="button"
                          className="secondaryButton"
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                          }}
                          onClick={() => setInspectUser(s)}
                        >
                          📄 View Document
                        </button>
                      )}

                      {!s.verified && (
                        <button
                          type="button"
                          className="primaryButton small"
                          onClick={() =>
                            validateSpecialist(s.id, true)
                          }
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p
                  className="muted"
                  style={{
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  No specialist applications yet.
                </p>
              )}
            </Card>

            <Card>
              <div className="sectionHead">
                <h2>Reports & Platform Activity</h2>
              </div>

              <div className="adminTiles">
                <div>
                  📝 <b>{postCount}</b>
                  <span>Community Posts</span>
                </div>

                <div>
                  🎓 <b>{workshopsCount}</b>
                  <span>Published Workshops</span>
                </div>

                <div>
                  📅 <b>{appointmentCount}</b>
                  <span>Booked Consultations</span>
                </div>

                <div>
                  💳 <b>125,000</b>
                  <span>FCFA Transaction Volume</span>
                </div>
              </div>
            </Card>
          </section>

          <aside>
            <Card>
              <h2>Administrative Tools</h2>

              <div className="quickLinks">
                <Link href="/appointments">Manage Bookings</Link>
                <Link href="/notifications">System Alerts</Link>
                <Link href="/settings">Admin Profile</Link>
                <Link href="/learner/specialists">
                  Directory Preview
                </Link>
              </div>
            </Card>

            <Card>
              <h2>Database & System Health</h2>

              <div className="health">
                ✓ PostgreSQL Connection <span>Active</span>
              </div>

              <div className="health">
                ✓ Document Audit Pipeline <span>Enabled</span>
              </div>

              <div className="health">
                ✓ Authentication Shield <span>Secure</span>
              </div>
            </Card>
          </aside>
        </div>

        {/* DOCUMENT INSPECTION MODAL */}
        {inspectUser && (
          <div
            className="modalOverlay"
            onClick={() => setInspectUser(null)}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "580px" }}
            >
              <div
                className="sectionHead"
                style={{ marginBottom: "12px" }}
              >
                <h2>Specialist Document Verification</h2>

                <button
                  type="button"
                  onClick={() => setInspectUser(null)}
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: "var(--bg-card-subtle)",
                  padding: "16px",
                  borderRadius: "12px",
                  marginBottom: "18px",
                }}
              >
                <p style={{ margin: "4px 0" }}>
                  <b>Applicant:</b> {inspectUser.name}
                </p>

                <p style={{ margin: "4px 0" }}>
                  <b>Email:</b> {inspectUser.email}
                </p>

                <p style={{ margin: "4px 0" }}>
                  <b>Specialization:</b> {inspectUser.domain}
                </p>

                <p style={{ margin: "4px 0" }}>
                  <b>Bio:</b> {inspectUser.bio || "None provided"}
                </p>
              </div>

              <div
                style={{
                  border: "2px dashed var(--border-color)",
                  padding: "20px",
                  borderRadius: "14px",
                  textAlign: "center",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "38px",
                    marginBottom: "8px",
                  }}
                >
                  📄
                </div>

                <h3 style={{ fontSize: "16px" }}>
                  {inspectUser.verificationDocument?.fileName ||
                    "Verification_Document.pdf"}
                </h3>

                <small
                  style={{
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  Submitted on{" "}
                  {inspectUser.verificationDocument?.uploadedAt ||
                    "Recent"}{" "}
                  · Type:{" "}
                  {inspectUser.verificationDocument?.fileType ||
                    "application/pdf"}
                </small>

                {inspectUser.verificationDocument?.fileData &&
                  inspectUser.verificationDocument?.fileType?.startsWith(
                    "image/"
                  ) && (
                    <div
                      style={{
                        marginTop: "14px",
                        maxHeight: "200px",
                        overflow: "hidden",
                        borderRadius: "8px",
                      }}
                    >
                      <img
                        src={
                          inspectUser.verificationDocument.fileData
                        }
                        alt="Document Preview"
                        style={{
                          width: "100%",
                          height: "auto",
                        }}
                      />
                    </div>
                  )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="secondaryButton"
                  style={{ color: "var(--danger)" }}
                  onClick={() =>
                    validateSpecialist(inspectUser.id, false)
                  }
                >
                  ✕ Reject Document
                </button>

                <button
                  type="button"
                  className="primaryButton"
                  onClick={() =>
                    validateSpecialist(inspectUser.id, true)
                  }
                >
                  ✓ Validate & Approve Specialist
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </RoleGuard>
  );
}

function Metric({ n, t }: { n: any; t: string }) {
  return (
    <Card>
      <strong className="metric">{n}</strong>
      <span>{t}</span>
    </Card>
  );
}
