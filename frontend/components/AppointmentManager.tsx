"use client";

import { useState } from "react";
import Link from "next/link";
import { api, AppointmentRecord } from "@/lib/api";
import Icon from "@/components/learner/Icon";
import "./appointments.css";

const tabs = ["Upcoming", "Pending", "Past", "Completed", "Cancelled", "All"];
const active = (a: AppointmentRecord) => ["PENDING", "CONFIRMED", "APPROVED"].includes(a.status);
const confirmed = (a: AppointmentRecord) => ["CONFIRMED", "APPROVED"].includes(a.status);
const ended = (a: AppointmentRecord) => +new Date(a.endDate || a.date) <= Date.now();
const safeLink = (value: string | null) => {
  try { const url = new URL(value || ""); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
};

export default function AppointmentManager({ items, onChange, specialist = false, verification }: {
  items: AppointmentRecord[]; onChange: (item: AppointmentRecord) => void; specialist?: boolean; verification?: string;
}) {
  const [tab, setTab] = useState("Upcoming");
  const [editing, setEditing] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [action, setAction] = useState<{ id: string; status: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const specialistVerified = !specialist || verification === "VERIFIED";
  const matches = (a: AppointmentRecord, category: string) => category === "All" || (category === "Upcoming" ? active(a) && !ended(a) : category === "Past" ? active(a) && ended(a) : a.status === category.toUpperCase());
  const shown = items.filter(a => matches(a, tab)).sort((a, b) => tab === "Upcoming" ? +new Date(a.date) - +new Date(b.date) : +new Date(b.date) - +new Date(a.date));
  async function update(a: AppointmentRecord, data: Parameters<typeof api.updateAppointment>[1]) {
    setBusy(a.id); setError(""); setNotice("");
    try {
      const result = await api.updateAppointment(a.id, data);
      onChange(result.appointment); setEditing(null); setAction(null);
      setNotice(data.status === "CONFIRMED" ? "Session confirmed. The learner has been notified." : data.status === "CANCELLED" ? "Appointment cancelled and the time released." : data.status === "COMPLETED" ? "Session marked completed." : "Meeting details saved. The learner has been notified.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update appointment"); }
    finally { setBusy(null); }
  }
  return <div className="appointmentManager">
    <p className="appointmentTimezone">All times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Past sessions remain available in your history.</p>
    {error && <div role="alert" className="formAlert error">{error}</div>}
    {notice && <div role="status" className="formAlert success">{notice}</div>}
    <div className="notificationTabs appointmentTabs" aria-label="Filter appointments">{tabs.map(name => <button key={name} aria-pressed={tab === name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{name}<span>{items.filter(a => matches(a, name)).length}</span></button>)}</div>
    <section className="appointmentCards">{shown.length ? shown.map(a => {
      const person = specialist ? a.learner : a.specialist;
      const contact = `/${specialist ? "specialist" : "learner"}/messages?contact=${person.id}`;
      const link = safeLink(a.meetingUrl);
      return <article className="panel sessionCard" key={a.id} aria-busy={busy === a.id}>
        <div className="sessionHeading"><div className="appointmentDate"><strong>{new Date(a.date).getDate()}</strong><span>{new Date(a.date).toLocaleDateString([], { month: "short" })}</span></div><div><h2>{person.name}</h2><p>{new Date(a.date).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p><p>{new Date(a.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{a.endDate && ` – ${new Date(a.endDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`} · {a.format}</p></div><span className={`appointmentStatus ${a.status.toLowerCase()}`}>{a.status === "APPROVED" ? "Confirmed" : a.status.toLowerCase()}</span></div>
        <div className="sessionDetails"><div><h3>Session context</h3><p>{a.notes || "No context provided."}</p></div><div><h3>{a.format === "In-person" ? "Location & instructions" : "Meeting details"}</h3>
          {a.specialistNotes && <p>{a.specialistNotes}</p>}
          {a.format === "Chat" && !link ? <p>This session takes place in Learnova messages.</p> : link ? <p className="sessionUrl">{link}</p> : <p>{a.status === "PENDING" ? "Meeting details will be shared when the specialist confirms." : a.format === "In-person" && a.specialistNotes ? "Meet at the location above." : "Meeting details have not been added. Message your specialist to arrange them."}</p>}
          {a.status === "PENDING" && ended(a) && <p>This request has expired. Arrange a new time with your specialist.</p>}
        </div></div>
        <div className="sessionActions">
          {confirmed(a) && !ended(a) && (link ? <a className="learnerPrimary compact" href={link} target="_blank" rel="noopener noreferrer"><Icon name="video" size={16}/>{specialist ? "Open meeting" : "Join meeting"} ↗</a> : a.format === "Chat" ? <Link className="learnerPrimary compact" href={contact}>Open session chat</Link> : null)}
          <Link className="outlineAction" href={contact}>Message {specialist ? "learner" : "specialist"}</Link>
          {specialist && active(a) && <button className="outlineAction" disabled={!!busy || !specialistVerified} title={!specialistVerified ? "Requires administrator verification" : undefined} onClick={() => { setEditing(a.id); setMeetingUrl(a.meetingUrl || ""); setInstructions(a.specialistNotes || ""); setAction(null); setError(""); }}>{a.status === "PENDING" ? "Review & confirm" : "Edit meeting details"}</button>}
          {specialist && confirmed(a) && ended(a) && <button className="outlineAction" disabled={!!busy || !specialistVerified} title={!specialistVerified ? "Requires administrator verification" : undefined} onClick={() => { setAction({ id: a.id, status: "COMPLETED" }); setEditing(null); }}>Mark completed</button>}
          {active(a) && <button className="outlineAction dangerAction" disabled={!!busy} onClick={() => { setAction({ id: a.id, status: "CANCELLED" }); setEditing(null); }}>{specialist && a.status === "PENDING" ? "Decline request" : "Cancel appointment"}</button>}
        </div>
        {editing === a.id && <form className="sessionEditor" onSubmit={e => { e.preventDefault(); void update(a, { meetingUrl, specialistNotes: instructions, ...(a.status === "PENDING" ? { status: "CONFIRMED" } : {}) }); }}>
          <h3>{a.status === "PENDING" ? "Prepare and confirm this session" : "Update meeting details"}</h3>
          {a.format === "Video" && <p>Create a meeting with your preferred video provider, then paste its invitation link here. Your learner will use this link to join outside Learnova.</p>}
          {a.format !== "In-person" && <label>{a.format === "Video" ? "Meeting link (required)" : "External meeting link (optional)"}<input autoFocus type="url" required={a.format === "Video"} maxLength={2048} value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://meet.example.com/your-meeting"/><small>{a.format === "Chat" ? "Leave empty to use Learnova messages." : "Use the participant invitation link, not a private host link."}</small></label>}
          <label>{a.format === "In-person" ? "Meeting location & instructions (required)" : "Joining instructions (optional)"}<textarea required={a.format === "In-person"} maxLength={5000} rows={3} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder={a.format === "In-person" ? "Address, room and arrival instructions" : "Passcode, preparation or anything the learner should know"}/><small>These details are shared with the learner.</small></label>
          <div className="sessionActions"><button className="learnerPrimary compact" disabled={!!busy || (a.status === "PENDING" && +new Date(a.date) <= Date.now())}>{busy === a.id ? "Saving…" : a.status === "PENDING" ? "Confirm & notify learner" : "Save meeting details"}</button><button type="button" className="outlineAction" disabled={!!busy} onClick={() => setEditing(null)}>Close editor</button></div>
        </form>}
        {action?.id === a.id && <div className="sessionConfirmation"><p>{action.status === "CANCELLED" ? "Cancel this appointment? The other participant will be notified and the time will become available again. To reschedule, book a new available time after cancelling." : "Mark this session completed? This will close the appointment."}</p><div className="sessionActions"><button className="learnerPrimary compact" disabled={!!busy} onClick={() => void update(a, { status: action.status })}>{busy === a.id ? "Saving…" : "Confirm"}</button><button className="outlineAction" disabled={!!busy} onClick={() => setAction(null)}>Go back</button></div></div>}
      </article>;
    }) : <div className="emptyState panel"><Icon name="calendar" size={30}/><h3>No {tab.toLowerCase()} appointments</h3><p>{specialist ? "Share your availability so learners can request a session." : "Choose an available time with a specialist to request a session."}</p><Link className="outlineAction" href={specialist ? "/specialist/availability" : "/learner/specialists"}>{specialist ? "Manage availability" : "Find a specialist"}</Link></div>}</section>
  </div>;
}
