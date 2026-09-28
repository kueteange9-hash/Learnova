"use client";

import { useEffect, useRef, useState } from "react";
import { api, WorkshopRecord } from "@/lib/api";
import { assetUrl } from "@/lib/assets";
import Icon from "@/components/learner/Icon";
import { DateTile, Empty, dateLabel, priceLabel } from "@/components/workshops/shared";

const localDate = (value: string) => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const initial = { title: "", description: "", date: "", type: "FREE", price: "", meetingUrl: "" };
export default function SpecialistWorkshopsPage() {
  const [items, setItems] = useState<WorkshopRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("list");
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState<WorkshopRecord | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [selected, setSelected] = useState<WorkshopRecord | null>(null);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [verification, setVerification] = useState<string>("VERIFIED");
  useEffect(() => {
    Promise.all([api.getMyWorkshops(), api.getMySpecialistProfile()])
      .then(([x, p]) => {
        setItems(x.workshops);
        setVerification(p.specialist.verification);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { titleRef.current?.focus(); }, [view]);
  useEffect(() => { if (!image) { setImagePreview(""); return; } const url = URL.createObjectURL(image); setImagePreview(url); return () => URL.revokeObjectURL(url); }, [image]);
  const cover = imagePreview || (!removeImage && editing?.image ? assetUrl(editing.image) : "");
  function editWorkshop(w: WorkshopRecord) {
    setEditing(w); setDraft({ title: w.title, description: w.description, date: localDate(w.date), type: w.type, price: String(w.price || ""), meetingUrl: w.meetingUrl || "" });
    setImage(null); setRemoveImage(false); setError(""); setNotice(""); setView("create");
  }
  const validSchedule = () => !!draft.date && (Date.parse(draft.date) > Date.now() || !!editing && draft.date === localDate(editing.date));
  const update = (key: keyof typeof initial, value: string) => setDraft(d => ({ ...d, [key]: value }));
  function returnToList() { setView("list"); setSelected(null); setError(""); setDeleting(false); }
  async function publish() {
    if (lock.current) return;
    if (!validSchedule()) { setError("Choose a start time in the future."); setView("create"); return; }
    lock.current = true; setBusy(true); setError("");
    const data = new FormData();
    Object.entries(draft).forEach(([key, value]) => data.set(key, key === "date" ? (editing && value === localDate(editing.date) ? editing.date : new Date(value).toISOString()) : value.trim()));
    if (image) data.set("image", image);
    data.set("removeImage", String(removeImage));
    try { const result = editing ? await api.updateWorkshop(editing.id, data) : await api.createWorkshop(data); setItems(current => editing ? current.map(w => w.id === editing.id ? result.workshop : w) : [...current, result.workshop]); setDraft(initial); setImage(null); setEditing(null); setRemoveImage(false); setTab("all"); returnToList(); setNotice(editing ? "Workshop updated. Your changes are now visible to learners." : "Workshop published. Learners can now view it in Explore workshops."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not publish workshop."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function saveRoom(e: React.FormEvent) {
    e.preventDefault(); if (!selected || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { const result = await api.updateWorkshopMeetingUrl(selected.id, meetingUrl.trim()); setSelected(result.workshop); setItems(current => current.map(w => w.id === selected.id ? result.workshop : w)); setNotice("Meeting link saved."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save meeting link."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (!selected || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await api.deleteWorkshop(selected.id); setItems(current => current.filter(w => w.id !== selected.id)); returnToList(); setNotice("Workshop removed."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not remove workshop."); }
    finally { lock.current = false; setBusy(false); }
  }
  const visible = items.filter(w => (tab === "all" || (tab === "past" ? +new Date(w.date) <= Date.now() : +new Date(w.date) > Date.now())) && w.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => tab === "past" ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date));

  return <div className="learnerPage ws-page">
    {view !== "list" && <button className="ws-back" disabled={busy} onClick={returnToList}>&larr; Back to workshops</button>}
    <header className="ws-heading"><div><h1 ref={titleRef} tabIndex={-1}>{view === "create" || view === "review" ? (editing ? "Edit workshop" : "Create a workshop") : view === "manage" ? selected?.title : "Workshops"}</h1><p>{view === "list" ? "Plan your sessions and keep everything ready for your learners." : view === "manage" ? dateLabel(selected!.date) : editing ? "Update your session and review your changes before saving." : "Set up your session, then check the details before publishing."}</p></div>{view === "list" && (verification === "VERIFIED" ? <button className="ws-primary" onClick={() => { setEditing(null); setDraft(initial); setImage(null); setRemoveImage(false); setView("create"); setNotice(""); setError(""); }}>+ Create workshop</button> : <button className="ws-primary" disabled title="Verification required">+ Create workshop (Requires Admin Approval)</button>)}</header>
    {verification !== "VERIFIED" && view === "list" && <div className="ws-notice" role="alert" style={{ background: "#fffbeb", borderColor: "#f59e0b", color: "#92400e", marginBottom: "1rem" }}>Your specialist account is currently in <strong>{verification.toLowerCase()}</strong> status. Creating and publishing workshops will be unlocked once an administrator approves your verification request.</div>}
    {error && <div className="ws-error" role="alert">{error}</div>}{notice && <div className="ws-notice" role="status">{notice}</div>}
    {(view === "create" || view === "review") && <><ol className="ws-steps"><li aria-current={view === "create" ? "step" : undefined}><span>1</span>Session details</li><li aria-current={view === "review" ? "step" : undefined}><span>2</span>{editing ? "Review & save" : "Review & publish"}</li></ol><div className="ws-detail-grid"><section className="ws-surface ws-detail">
      {view === "create" ? <form className="ws-form" onSubmit={e => { e.preventDefault(); setError(""); if (!draft.title.trim() || !draft.description.trim()) { setError("Add a title and description."); return; } if (!validSchedule()) { setError("Choose a start time in the future."); return; } setView("review"); }}>
        <h2>The session</h2><label>Workshop title<input required maxLength={150} value={draft.title} onChange={e => update("title", e.target.value)} placeholder="e.g. Prepare for your first job interview"/></label><label>What will learners take away?<textarea required rows={5} value={draft.description} onChange={e => update("description", e.target.value)} placeholder="Describe who this is for, what you’ll cover, and what learners should bring."/></label><label>Start date and time<input required type="datetime-local" value={draft.date} onChange={e => update("date", e.target.value)}/><small>Enter the time in your local timezone.</small></label>
        <h2>Admission</h2><div className="ws-field-row"><label>Access<select value={draft.type} onChange={e => update("type", e.target.value)}><option value="FREE">Free registration</option><option value="PAID">Paid registration</option></select></label>{draft.type === "PAID" && <label>Price per person (FCFA)<input required type="number" min="1" step="1" value={draft.price} onChange={e => update("price", e.target.value)}/></label>}</div>{draft.type === "PAID" && <div className="ws-notice">Paid workshops can be published, but learners cannot register until payments are available.</div>}
        <h2>Joining information</h2><label>Meeting link <small>Optional</small><input type="url" pattern="https?://.*" value={draft.meetingUrl} onChange={e => update("meetingUrl", e.target.value)} placeholder="https://zoom.us/j/…"/><small>You can add this later. Add it before the session so learners can join.</small></label><label>Cover image <small>Optional · any image format · up to 15 MB</small><input key={`${editing?.id || "new"}-${removeImage}`} type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file && file.size > 15 * 1024 * 1024) { e.target.value = ""; setImage(null); setError("Choose an image smaller than 15 MB."); } else { setImage(file || null); if (file) setRemoveImage(false); setError(""); } }}/>{image && <small>Selected: {image.name}</small>}</label>{cover && <div className="ws-cover-editor"><img src={cover} alt="Workshop cover preview"/><button type="button" className="ws-secondary" onClick={() => { setImage(null); setRemoveImage(true); }}>Remove cover image</button></div>}<div className="ws-form-footer"><button type="button" className="ws-secondary" onClick={returnToList}>Cancel</button><button className="ws-primary" type="submit">Review workshop <Icon name="arrow" size={16}/></button></div>
      </form> : <><p className="ws-eyebrow">PREVIEW</p><h2 className="ws-review-title">{draft.title}</h2><p className="ws-description">{draft.description}</p><dl className="ws-review-facts"><div><dt>Starts</dt><dd>{dateLabel(draft.date)}</dd></div><div><dt>Admission</dt><dd>{draft.type === "FREE" ? "Free" : `${Number(draft.price).toLocaleString()} FCFA per person`}</dd></div><div><dt>Meeting link</dt><dd>{draft.meetingUrl || "Not added yet"}</dd></div><div><dt>Cover image</dt><dd>{image?.name || (!removeImage && editing?.image ? "Current cover image" : "No cover image")}</dd></div></dl>{draft.type === "PAID" && <div className="ws-notice">Payment is currently unavailable. This workshop will be visible, but paid registration will remain closed.</div>}<div className="ws-form-footer"><button className="ws-secondary" disabled={busy} onClick={() => setView("create")}>Edit details</button><button className="ws-primary" disabled={busy} onClick={publish}>{busy ? (editing ? "Saving changes..." : "Publishing...") : (editing ? "Save changes" : "Publish workshop")}</button></div></>}
    </section><aside className="ws-surface ws-summary"><h2>{editing ? "Your workshop card" : "Before you publish"}</h2>{cover && <img className="ws-preview-cover" src={cover} alt="Workshop cover preview"/>}{editing && <><h2>{draft.title}</h2><p className="ws-excerpt">{draft.description}</p><p>{draft.date ? dateLabel(draft.date) : "Choose a date"}</p><strong>{draft.type === "FREE" ? "Free" : `${Number(draft.price).toLocaleString()} FCFA`}</strong></>}<p>Give learners a clear idea of what they’ll learn and who the session is for.</p><hr/><p>Once published, your workshop appears in the learner directory.</p><p>You can manage the meeting link and view registrations from the workshop page.</p></aside></div></>}
    {view === "manage" && selected && <div className="ws-detail-grid"><section className="ws-surface ws-detail"><h2>Registered learners <span className="ws-count">{selected.registrations?.length || 0}</span></h2>{selected.registrations?.length ? <div className="ws-attendees">{selected.registrations.map(r => <div key={r.id}><div><strong>{r.learner.name}</strong><p>{r.learner.email}</p></div><span className="ws-status">{selected.type === "FREE" ? "Free admission" : r.paymentStatus === "COMPLETED" ? "Marked paid" : "Payment pending"}</span></div>)}</div> : <Empty title="No registrations yet">Learners who register for this workshop will appear here.</Empty>}<h2>About this session</h2><p className="ws-description">{selected.description}</p><div className="ws-danger-zone"><h2>Remove workshop</h2><p>This removes the workshop and its registrations. This action cannot be undone.</p>{deleting ? <div className="ws-inline-actions"><button className="ws-danger" disabled={busy} onClick={remove}>{busy ? "Removing…" : "Yes, remove workshop"}</button><button className="ws-secondary" disabled={busy} onClick={() => setDeleting(false)}>Keep workshop</button></div> : <button className="ws-danger" onClick={() => setDeleting(true)}>Remove workshop</button>}</div></section><aside className="ws-surface ws-summary"><button className="ws-primary" disabled={busy} onClick={() => editWorkshop(selected)}>Edit workshop</button><h2>Meeting room</h2><p>Share the link learners will use to join your session.</p><form className="ws-form" onSubmit={saveRoom}><label>Meeting URL<input type="url" pattern="https?://.*" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://zoom.us/j/…"/></label><button className="ws-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save meeting link"}</button></form>{selected.meetingUrl && <a className="ws-back" href={selected.meetingUrl} target="_blank" rel="noopener noreferrer">Open meeting room &nearr;</a>}<hr/><p>Admission: <strong>{priceLabel(selected)}</strong></p></aside></div>}
    {view === "list" && <><div className="ws-tabs" aria-label="Workshop views"><button aria-pressed={tab === "all"} onClick={() => setTab("all")}>All workshops ({items.length})</button><button aria-pressed={tab === "upcoming"} onClick={() => setTab("upcoming")}>Upcoming</button><button aria-pressed={tab === "past"} onClick={() => setTab("past")}>Past sessions</button></div><div className="ws-tools"><label className="ws-search"><Icon name="search" size={18}/><input aria-label="Search your workshops" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a workshop"/></label><span className="ws-result-count">{visible.length} workshops</span></div>{loading ? <div className="ws-empty" role="status">Loading your workshops…</div> : visible.length ? <div className="ws-catalog ws-host-catalog">{visible.map(w => <article className="ws-surface ws-card" key={w.id}>
      {w.image ? <img className="ws-cover" src={assetUrl(w.image)} alt={w.title}/> : <div className="ws-cover-placeholder"><Icon name="video" size={32}/><span>Online workshop</span></div>}
      <div className="ws-card-content">
        <div className="ws-card-top"><DateTile date={w.date}/><span className="ws-status">{+new Date(w.date) > Date.now() ? "Upcoming" : "Past session"}</span></div>
        <h2>{w.title}</h2><p className="ws-excerpt">{w.description}</p>
        <p className="ws-time"><Icon name="clock" size={15}/>{dateLabel(w.date)}</p>
        <div className="ws-host-card-meta"><strong>{priceLabel(w)}</strong><span>{w.registrations?.length || 0} registered</span></div>
        <span className={w.meetingUrl ? "ws-room ready" : "ws-room"}>{w.meetingUrl ? "Meeting link ready" : "Meeting link needed"}</span>
        <footer><button className="ws-primary" onClick={() => editWorkshop(w)}>Edit workshop</button><button className="ws-secondary" onClick={() => { setSelected(w); setMeetingUrl(w.meetingUrl || ""); setView("manage"); setError(""); setNotice(""); }}>Manage <Icon name="arrow" size={16}/></button></footer>
      </div>
    </article>)}</div> : <Empty title={query ? "No matching workshops" : tab === "past" ? "No past sessions" : "Your next workshop belongs here"}>{query ? "Try another workshop title." : tab === "past" ? "Your previous sessions will appear here." : "Create a workshop to share your expertise with learners."}</Empty>}</>}
  </div>;
}
