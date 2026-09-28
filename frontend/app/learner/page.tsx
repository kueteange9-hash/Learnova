"use client";

import { assetUrl } from "@/lib/assets";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api, AppointmentRecord, SpecialistProfile, RecommendedSpecialist, WorkshopRecord } from "@/lib/api";
import { currentUser, User } from "@/lib/store";

const initials = (name: string) => name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();

export default function LearnerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [specialists, setSpecialists] = useState<SpecialistProfile[]>([]);
  const [recommended, setRecommended] = useState<RecommendedSpecialist[]>([]);
  const [learnerProfile, setLearnerProfile] = useState<any | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setUser(currentUser());
    Promise.all([
      api.getAppointments(),
      api.getSpecialists(),
      api.getWorkshops(),
      api.getRecommendedSpecialists().catch(() => ({ learnerProfile: null, recommendations: [] })),
    ])
      .then(([a, s, w, r]) => {
        setAppointments(a.appointments);
        setSpecialists(s.specialists);
        setWorkshops(w.workshops);
        if (r) {
          if (r.recommendations) setRecommended(r.recommendations);
          if (r.learnerProfile) setLearnerProfile(r.learnerProfile);
        }
      })
      .catch(e => setError(e.message));
  }, []);

  const upcoming = appointments
    .filter(a => ["PENDING", "CONFIRMED"].includes(a.status) && new Date(a.date) >= new Date())
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const next = upcoming[0];

  return (
    <div className="learnerPage">
      <section className="dashboardHello">
        <div>
          <p className="pageKicker">LEARNER OVERVIEW</p>
          <h1>Welcome back, {user?.name.split(" ")[0] || "Learner"}</h1>
          <p>Your appointments and personalized guidance recommendations, all in one place.</p>
        </div>
        <Link href="/learner/specialists" className="learnerPrimary">
          <Icon name="search" size={17} />
          Find a specialist
        </Link>
      </section>

      {error && <div className="formAlert error">Some live information could not be loaded: {error}</div>}

      <section className="learnerStats">
        <div className="statTile">
          <span className="statIcon purple">
            <Icon name="calendar" />
          </span>
          <div>
            <strong>{upcoming.length}</strong>
            <p>Upcoming sessions</p>
          </div>
        </div>
        <div className="statTile">
          <span className="statIcon orange">
            <Icon name="clock" />
          </span>
          <div>
            <strong>{appointments.filter(a => a.status === "PENDING").length}</strong>
            <p>Awaiting confirmation</p>
          </div>
        </div>
        <div className="statTile">
          <span className="statIcon green">
            <Icon name="users" />
          </span>
          <div>
            <strong>{specialists.length}</strong>
            <p>Verified specialists</p>
          </div>
        </div>
        <div className="statTile">
          <span className="statIcon blue">
            <Icon name="sparkles" />
          </span>
          <div>
            <strong>{workshops.length}</strong>
            <p>Upcoming workshops</p>
          </div>
        </div>
      </section>

      <div className="overviewGrid">
        <section className="panel nextSession">
          <div className="panelHeading">
            <div>
              <span className="liveDot" />
              NEXT SESSION
            </div>
            <Link href="/learner/appointments">
              View schedule <Icon name="arrow" size={14} />
            </Link>
          </div>
          {next ? (
            <>
              <div className="sessionBody">
                <div className="avatar avatar-purple">
                  {next.specialist.image ? <img src={assetUrl(next.specialist.image)} alt="" /> : initials(next.specialist.name)}
                </div>
                <div className="sessionInfo">
                  <h3>{next.specialist.name}</h3>
                  <p>{next.specialist.specialist?.headline || next.specialist.specialist?.domain}</p>
                  <div className="sessionMeta">
                    <span>
                      <Icon name="calendar" size={15} />
                      {new Date(next.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span>
                      <Icon name="clock" size={15} />
                      {new Date(next.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span>
                      <Icon name="video" size={15} />
                      {next.format}
                    </span>
                  </div>
                </div>
                {next.meetingUrl ? (
                  <a href={next.meetingUrl} target="_blank" rel="noreferrer" className="learnerPrimary compact">
                    <Icon name="video" size={16} />
                    Join session
                  </a>
                ) : (
                  <span className={`appointmentStatus ${next.status.toLowerCase()}`}>{next.status}</span>
                )}
              </div>
              <div className="sessionNote">
                <Icon name="sparkles" size={16} />
                <span>
                  <b>Prepare for your session</b> · Review the context you sent and note your most important question.
                </span>
              </div>
            </>
          ) : (
            <div className="emptyCompact">
              <Icon name="calendar" />
              <div>
                <b>No upcoming sessions</b>
                <p>Choose a verified specialist and book one of their open times.</p>
              </div>
              <Link href="/learner/specialists" className="outlineAction">
                Explore specialists
              </Link>
            </div>
          )}
        </section>

        <aside className="panel journeyCard">
          <div className="panelHeading">
            <div>GET STARTED</div>
          </div>
          <h3>Make guidance work for you</h3>
          <p>A little preparation makes every session more useful.</p>
          <ul>
            <li className="done">
              <Icon name="check" size={14} />
              <span>Complete your learner profile</span>
            </li>
            <li className={specialists.length ? "done" : "current"}>
              <Icon name={specialists.length ? "check" : "search"} size={14} />
              <span>Explore verified specialists</span>
            </li>
            <li className={upcoming.length ? "done" : "current"}>
              <span>3</span>
              <b>Book a suitable open time</b>
            </li>
            <li>
              <span>4</span>Prepare your session questions
            </li>
          </ul>
        </aside>
      </div>

      {/* Optional Onboarding Callout Banner if incomplete */}
      {(!learnerProfile || !learnerProfile.interests?.length) && (
        <section
          style={{
            background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
            border: "1px solid #ddd6fe",
            borderRadius: "14px",
            padding: "20px 24px",
            marginTop: "1.2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 4px 14px rgba(124, 58, 237, 0.06)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#7c3aed", fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>✦</span> OPTIONAL ONBOARDING
            </div>
            <h3 style={{ margin: "4px 0 2px", color: "#1e1b4b", fontSize: "1.05rem", fontWeight: 700 }}>
              Get Personalized AI Specialist Recommendations
            </h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.86rem" }}>
              Take 1 minute to answer 3 quick questions about your goals and preferences to get tailored specialist recommendations.
            </p>
          </div>
          <Link href="/learner/onboarding" className="learnerPrimary" style={{ whiteSpace: "nowrap" }}>
            Start optional onboarding →
          </Link>
        </section>
      )}

      {/* AI Recommendation Banner & Top Matches */}
      {recommended.length > 0 && (
        <section style={{ marginTop: "1rem" }}>
          <div className="contentHeading">
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#7c3aed" }}>✦</span> AI Recommended Specialists
              </h2>
              <p>Matched specifically to your onboarding interests, goals, and desired learning format.</p>
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <Link href="/learner/onboarding" style={{ color: "#7c3aed", fontSize: "0.85rem", fontWeight: 600 }}>
                Update preferences
              </Link>
              <Link href="/learner/specialists?sort=ai">
                View recommendations <Icon name="arrow" size={15} />
              </Link>
            </div>
          </div>

          <div className="miniSpecialistGrid">
            {recommended.slice(0, 3).map((s, index) => {
              const nextSlot = s.availability.find(x => !x.booked);
              return (
                <article className="miniSpecialist" key={s.id} style={{ borderTop: "3px solid #7c3aed" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                    <div className={`profileAvatar avatar-${["coral", "blue", "green"][index % 3]}`}>
                      {s.user.image ? <img src={assetUrl(s.user.image)} alt="" /> : initials(s.user.name)}
                      <span>✓</span>
                    </div>
                  </div>

                  <div className="specialistTitle">
                    <h3>{s.user.name}</h3>
                    <p>{s.headline || s.domain}</p>
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "#6b7280", fontStyle: "italic", margin: "0.25rem 0" }}>
                    {s.matchReason}
                  </div>

                  <div className="matchBar">
                    {s.matchBadges.map(x => (
                      <span key={x} style={{ backgroundColor: "#7c3aed15", color: "#7c3aed", fontWeight: 600 }}>
                        {x}
                      </span>
                    ))}
                  </div>

                  <div className="availability">
                    <span />
                    <div>
                      <small>NEXT AVAILABLE</small>
                      <b>
                        {nextSlot
                          ? new Date(nextSlot.startsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })
                          : "No open times"}
                      </b>
                    </div>
                  </div>

                  <Link href={`/learner/specialists?specialist=${s.userId}`} className="outlineAction">
                    View profile & book
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="contentHeading">
          <div>
            <h2>Verified specialists</h2>
            <p>Real professionals currently available on Learnova.</p>
          </div>
          <Link href="/learner/specialists">
            View all specialists <Icon name="arrow" size={15} />
          </Link>
        </div>
        {specialists.length ? (
          <div className="miniSpecialistGrid">
            {specialists.slice(0, 3).map((s, index) => {
              const nextSlot = s.availability.find(x => !x.booked);
              return (
                <article className="miniSpecialist" key={s.id}>
                  <div className={`profileAvatar avatar-${["coral", "blue", "green"][index % 3]}`}>
                    {s.user.image ? <img src={assetUrl(s.user.image)} alt="" /> : initials(s.user.name)}
                    <span>✓</span>
                  </div>
                  <div className="specialistTitle">
                    <h3>{s.user.name}</h3>
                    <p>{s.headline || s.domain}</p>
                  </div>
                  <div className="matchBar">
                    {s.expertise.slice(0, 2).map(x => (
                      <span key={x}>{x}</span>
                    ))}
                  </div>
                  <div className="availability">
                    <span />
                    <div>
                      <small>NEXT AVAILABLE</small>
                      <b>
                        {nextSlot
                          ? new Date(nextSlot.startsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })
                          : "No open times"}
                      </b>
                    </div>
                  </div>
                  <Link href={`/learner/specialists?specialist=${s.userId}`} className="outlineAction">
                    View profile
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="emptyState panel">
            <Icon name="users" size={28} />
            <h3>No verified specialists are available yet</h3>
            <p>Approved specialists will appear here after completing their profiles.</p>
          </div>
        )}
      </section>

      {workshops.length > 0 && (
        <section>
          <div className="contentHeading">
            <div>
              <h2>Upcoming workshops</h2>
              <p>Sessions published by specialists on the platform.</p>
            </div>
            <Link href="/learner/workshops">
              Explore workshops <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="dashboardWorkshops">
            {workshops.slice(0, 2).map(w => (
              <article className="workshopRow" key={w.id}>
                <div className="dateBlock">
                  <strong>{new Date(w.date).getDate()}</strong>
                  <span>{new Date(w.date).toLocaleDateString([], { month: "short" }).toUpperCase()}</span>
                </div>
                <div className="workshopCopy">
                  <span className="tinyCategory">{w.type}</span>
                  <h3>{w.title}</h3>
                  <p>
                    Hosted by {w.specialist.name} · {new Date(w.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <Link href="/learner/workshops" className="outlineAction">
                  View workshop
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
