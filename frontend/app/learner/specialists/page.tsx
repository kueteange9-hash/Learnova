"use client";

import { assetUrl } from "@/lib/assets";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import SpecialistFollowButton from "@/components/learner/SpecialistFollowButton";
import Icon from "@/components/learner/Icon";
import { api, SpecialistProfile, RecommendedSpecialist } from "@/lib/api";

const initials = (name: string) => name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
const nextTime = (profile: SpecialistProfile) => profile.availability.find(x => !x.booked)?.startsAt;

function SpecialistsContent() {
  const params = useSearchParams();
  const selectedId = params.get("specialist");
  const sortParam = params.get("sort");
  const [items, setItems] = useState<SpecialistProfile[]>([]);
  const [recommendationsMap, setRecommendationsMap] = useState<Map<string, RecommendedSpecialist>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(sortParam === "ai" ? "✦ AI Best Match" : "Recently updated");

  useEffect(() => {
    Promise.all([
      api.getSpecialists(),
      api.getRecommendedSpecialists().catch(() => ({ recommendations: [] })),
    ])
      .then(([s, r]) => {
        setItems(s.specialists);
        if (r && r.recommendations) {
          const map = new Map<string, RecommendedSpecialist>();
          r.recommendations.forEach(rec => map.set(rec.id, rec));
          setRecommendationsMap(map);
          if (sortParam === "ai") {
            setSort("✦ AI Best Match");
          }
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sortParam]);

  const categories = ["All", ...Array.from(new Set(items.map(x => x.domain)))];

  const visible = useMemo(() => {
    return items
      .filter(
        s =>
          (category === "All" || s.domain === category) &&
          `${s.user.name} ${s.headline || ""} ${s.expertise.join(" ")}`.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => {
        if (sort === "✦ AI Best Match") {
          const recA = recommendationsMap.get(a.id)?.matchScore ?? 0;
          const recB = recommendationsMap.get(b.id)?.matchScore ?? 0;
          return recB - recA;
        }
        if (sort === "Price: low to high") return (a.sessionRate ?? 0) - (b.sessionRate ?? 0);
        if (sort === "Soonest available") return +(new Date(nextTime(a) || 8640000000000000)) - +(new Date(nextTime(b) || 8640000000000000));
        return 0;
      });
  }, [items, category, query, sort, recommendationsMap]);

  const selected = items.find(x => x.userId === selectedId);

  if (loading) return <div className="apiState">Loading verified specialists...</div>;
  if (error)
    return (
      <div className="apiState errorState">
        <h2>Specialists could not be loaded</h2>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    );
  if (selectedId && !selected)
    return (
      <div className="emptyState panel">
        <h3>Specialist not found</h3>
        <p>This profile may no longer be available.</p>
        <Link href="/learner/specialists" className="outlineAction">
          Back to specialists
        </Link>
      </div>
    );
  if (selected) return <SpecialistProfileView specialist={selected} recommendation={recommendationsMap.get(selected.id)} />;

  return (
    <div className="learnerPage">
      <section className="pageTitle">
        <div>
          <p className="pageKicker">EXPERT GUIDANCE</p>
          <h1>Find your specialist</h1>
          <p>Connect with verified professionals matched to your goals and learning preferences.</p>
        </div>
      </section>

      <div className="directoryTools">
        <div className="directorySearch">
          <Icon name="search" size={19} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, specialty, or expertise" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option>✦ AI Best Match</option>
          <option>Recently updated</option>
          <option>Soonest available</option>
          <option>Price: low to high</option>
        </select>
      </div>

      <div className="filterChips">
        {categories.map(c => (
          <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="resultsHeading">
        <p>
          <b>{visible.length} specialist{visible.length === 1 ? "" : "s"}</b> available
        </p>
        <span>
          <i /> Every listed specialist is verified
        </span>
      </div>

      {visible.length ? (
        <div className="specialistDirectory">
          {visible.map((s, index) => {
            const rec = recommendationsMap.get(s.id);
            return (
              <article className="specialistCard" key={s.id} style={rec && sort === "✦ AI Best Match" ? { borderTop: "3px solid #7c3aed" } : {}}>
                <div className="specialistCardTop">
                  <div className={`profileAvatar large avatar-${["coral", "blue", "gold", "green", "purple", "teal"][index % 6]}`}>
                    {s.user.image ? <img src={assetUrl(s.user.image)} alt="" /> : initials(s.user.name)}
                    <span>✓</span>
                  </div>
                  <div className="specialistCardIdentity">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h2>{s.user.name}</h2>
                    </div>
                    <p className="specialty">{s.headline || s.domain}</p>
                    <div className="realProfileMeta">
                      <span>
                        <Icon name="briefcase" size={14} />
                        {s.experience || "Experience not added"}
                      </span>
                      {typeof s.completedSessions === "number" && (
                        <span>
                          <Icon name="check" size={14} />
                          {s.completedSessions} sessions
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {rec && (
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", fontStyle: "italic", margin: "0.4rem 0 0.2rem" }}>
                    {rec.matchReason}
                  </div>
                )}

                {nextTime(s) && (
                  <div className="availableNow">
                    <i /> Has availability
                  </div>
                )}

                <p className="specialistBio">{s.user.bio || s.howIHelp || "This specialist is completing their professional introduction."}</p>

                <div className="skillTags">
                  {(rec?.matchBadges || s.expertise.slice(0, 3)).map(x => (
                    <span key={x} style={rec?.matchBadges?.includes(x) ? { backgroundColor: "#7c3aed15", color: "#7c3aed", fontWeight: 600 } : {}}>
                      {x}
                    </span>
                  ))}
                </div>

                <div className="specialistFooter">
                  <div>
                    <small>SESSION RATE</small>
                    <b>
                      {s.sessionRate === null ? "Contact specialist" : `${s.sessionRate.toLocaleString()} FCFA`}{" "}
                      {s.sessionRate !== null && <span>/ {s.sessionDuration} min</span>}
                    </b>
                  </div>
                  <Link href={`?specialist=${s.userId}`} className="learnerPrimary compact">
                    View profile
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="emptyState panel">
          <Icon name="search" size={28} />
          <h3>No verified specialists found</h3>
          <p>Try a different search or check again later.</p>
        </div>
      )}
    </div>
  );
}

function SpecialistProfileView({ specialist: s, recommendation }: { specialist: SpecialistProfile; recommendation?: RecommendedSpecialist }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [slots, setSlots] = useState(s.availability.filter(x => !x.booked && new Date(x.startsAt) > new Date()));
  const [selectedSlotId, setSelectedSlotId] = useState<string>(slots[0]?.id || "");
  const [requestedDate, setRequestedDate] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>(s.sessionFormats[0] || "Video");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookedAppointment, setBookedAppointment] = useState<any | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getFollowing()
      .then(result => {
        if (active) setFollowing(result.specialistIds.includes(s.userId));
      })
      .catch(() => {
        if (active) setFollowing(false);
      });
    return () => {
      active = false;
    };
  }, [s.userId]);

  const openBooking = () => {
    setShowBooking(true);
    window.setTimeout(() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  async function handleBookSession(e: React.FormEvent) {
    e.preventDefault();
    setBookingError("");
    if (!selectedSlotId && !requestedDate) {
      setBookingError("Please select an available time slot or choose a preferred date and time.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createAppointment({
        specialistId: s.userId,
        ...(selectedSlotId ? { slotId: selectedSlotId } : { requestedDate: new Date(requestedDate).toISOString() }),
        format: selectedFormat,
        notes: notes.trim(),
      });
      setBookedAppointment(res.appointment);
      setSlots(prev => prev.filter(slot => slot.id !== selectedSlotId));
    } catch (err: any) {
      setBookingError(err.message || "Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="learnerPage">
      <Link href="/learner/specialists" className="backAction">
        ← Back to specialists
      </Link>
      <section className="specialistProfileHero panel">
        <div className="profileAvatar xl avatar-purple">
          {s.user.image ? <img src={assetUrl(s.user.image)} alt="" /> : initials(s.user.name)}
          <span>✓</span>
        </div>
        <div className="profileHeroInfo">
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="verifiedText">✓ VERIFIED SPECIALIST</span>
          </div>
          <h1>{s.user.name}</h1>
          <p className="profileSpecialty">{s.headline || s.domain}</p>
          {recommendation && (
            <p style={{ color: "#7c3aed", fontSize: "0.85rem", fontStyle: "italic", margin: "0.25rem 0" }}>
              {recommendation.matchReason}
            </p>
          )}
          <p>{s.user.bio}</p>
          <div className="specialistProfileActions">
            <SpecialistFollowButton key={s.userId} specialistId={s.userId} name={s.user.name} onFollowingChange={setFollowing} />
            <button
              type="button"
              onClick={openBooking}
              className="learnerPrimary"
              disabled={following !== true}
              title={following === true ? "Choose a time and request an appointment" : "Follow this specialist before booking"}
            >
              <Icon name="calendar" size={16} /> Book appointment
            </button>
          </div>
          <div className="skillTags">
            {s.expertise.map(x => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </div>
        <div className="bookingSummary">
          <small>SESSION RATE</small>
          <strong>{s.sessionRate === null ? "Not set" : `${s.sessionRate.toLocaleString()} FCFA`}</strong>
          <span>{s.sessionDuration}-minute {s.sessionFormats.join(" or ").toLowerCase() || "guidance"} session</span>
          {following === true ? (
            <Link href={`/learner/messages?contact=${s.userId}`} className="outlineAction">
              <Icon name="message" size={16} />
              Send a message
            </Link>
          ) : (
            <button type="button" className="outlineAction" disabled style={{ opacity: 0.7 }}>
              Subscribe to message
            </button>
          )}
        </div>
      </section>

      {/* Inline Appointment Booking Section (Unlocked after following/subscribing) */}
      {following === true && showBooking ? (
        bookedAppointment ? (
          <div className="panel bookingSuccess" style={{ padding: "24px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "14px", marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#166534", fontWeight: 800, fontSize: "1.1rem" }}>
              <Icon name="check" size={20} /> Appointment Request Sent Successfully!
            </div>
            <p style={{ color: "#15803d", fontSize: "0.9rem", margin: "8px 0 16px" }}>
              Your session with <strong>{s.user.name}</strong> is scheduled for{" "}
              <strong>{new Date(bookedAppointment.date).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong> ({bookedAppointment.format}).
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <Link href="/learner/appointments" className="learnerPrimary compact">
                <Icon name="calendar" size={15} /> View My Schedule
              </Link>
              <Link href={`/learner/messages?contact=${s.userId}`} className="outlineAction compact">
                <Icon name="message" size={15} /> Send Message
              </Link>
            </div>
          </div>
        ) : (
          <section id="booking-section" className="panel bookingSection" style={{ padding: "24px", marginTop: "1rem", borderTop: "3px solid #7c3aed" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#1e1b4b", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="calendar" size={18} /> Book a Guidance Session
            </h2>
            <p style={{ fontSize: "0.88rem", color: "#6b7280", margin: "0 0 16px" }}>
              {slots.length > 0
                ? `Select an open time slot and preferred format to request a session with ${s.user.name}.`
                : `Choose a preferred date and time to send a booking request to ${s.user.name}. They will approve or decline the request.`}
            </p>

            {bookingError && (
              <div className="formAlert error" style={{ marginBottom: "16px" }}>
                <Icon name="close" size={16} />
                <span>{bookingError}</span>
              </div>
            )}

            <form className="bookingForm" onSubmit={handleBookSession} style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                  1. {slots.length > 0 ? "Select Available Time Slot:" : "Choose Preferred Date and Time:"}
                </label>
                {slots.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
                    {slots.map(slot => (
                    <button
                      type="button"
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: selectedSlotId === slot.id ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                        backgroundColor: selectedSlotId === slot.id ? "#f3e8ff" : "#ffffff",
                        color: selectedSlotId === slot.id ? "#7c3aed" : "#374151",
                        fontWeight: selectedSlotId === slot.id ? 700 : 500,
                        fontSize: "0.85rem",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>{new Date(slot.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric" })}</div>
                      <small style={{ opacity: 0.8 }}>
                        {new Date(slot.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ({s.sessionDuration} min)
                      </small>
                    </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="datetime-local"
                    value={requestedDate}
                    onChange={e => setRequestedDate(e.target.value)}
                    min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                    required
                    style={{ width: "100%", maxWidth: "360px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.88rem" }}
                  />
                )}
              </div>

              {s.sessionFormats.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                    2. Choose Session Format:
                  </label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {s.sessionFormats.map(fmt => (
                      <button
                        type="button"
                        key={fmt}
                        onClick={() => setSelectedFormat(fmt)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "9999px",
                          border: selectedFormat === fmt ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                          backgroundColor: selectedFormat === fmt ? "#7c3aed" : "#f8fafc",
                          color: selectedFormat === fmt ? "#ffffff" : "#475569",
                          fontWeight: selectedFormat === fmt ? 700 : 600,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                  3. What would you like to discuss in this session? <small style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</small>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Share your goals, questions, or topics you want to cover with this specialist..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.88rem",
                    resize: "vertical",
                  }}
                />
              </div>

              <div>
                <button type="submit" className="learnerPrimary" disabled={submitting || (!selectedSlotId && !requestedDate)}>
                  {submitting ? "Booking Session..." : `Confirm & Book Session (${s.sessionRate === null ? "Free" : `${s.sessionRate.toLocaleString()} FCFA`}) →`}
                </button>
              </div>
            </form>
          </section>
          )
        ) : (
        <div className="panel" style={{ padding: "18px 24px", marginTop: "1rem", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h4 style={{ margin: "0 0 2px", color: "#7c3aed", fontSize: "0.95rem", fontWeight: 700 }}>
              ✦ Follow {s.user.name} to Unlock Session Booking
            </h4>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>
              Subscribing (following) this specialist enables direct 1-to-1 session booking and messaging right on their profile.
            </p>
          </div>
          <SpecialistFollowButton key={s.userId} specialistId={s.userId} name={s.user.name} onFollowingChange={setFollowing} />
        </div>
      )}

      <div className="profileDetails">
        <section className="panel prosePanel">
          <h2>How I can help</h2>
          <p>{s.howIHelp || "This specialist has not added this information yet."}</p>
          <h2>Areas of expertise</h2>
          {s.expertise.length ? (
            <div className="expertiseList">
              {s.expertise.map((name, index) => (
                <div key={name}>
                  <span>
                    <Icon name="check" size={16} />
                  </span>
                  <div>
                    <b>{name}</b>
                    <p>{s.expertiseDescriptions[index] || "Ask this specialist how they can support you in this area."}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No areas of expertise have been added yet.</p>
          )}
        </section>
        <aside className="panel profileFacts">
          <h3>Professional details</h3>
          <div className="factList">
            <div>
              <span>Domain</span>
              <b>{s.domain}</b>
            </div>
            <div>
              <span>Languages</span>
              <b>{s.languages.join(", ")}</b>
            </div>
            <div>
              <span>Session formats</span>
              <b>{s.sessionFormats.join(", ")}</b>
            </div>
            <div>
              <span>Experience</span>
              <b>{s.experience || "Not added"}</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function SpecialistsPage() {
  return (
    <Suspense fallback={<div className="pageLoader">Loading specialists...</div>}>
      <SpecialistsContent />
    </Suspense>
  );
}
