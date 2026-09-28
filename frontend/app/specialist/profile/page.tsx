"use client";

import { assetUrl } from "@/lib/assets";
import { useEffect, useState } from "react";
import { updateCurrentProfile } from "@/lib/store";
import Icon from "@/components/learner/Icon";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { api, SpecialistProfile } from "@/lib/api";

const fallbackDomains = ["Career Guidance", "Academic Guidance", "Mental Wellbeing", "Entrepreneurship", "Agriculture", "Personal Development", "Technology"];

export default function SpecialistProfilePage() {
  const [profile, setProfile] = useState<SpecialistProfile | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [domains, setDomains] = useState(fallbackDomains);

  useEffect(() => {
    api.getDomains().then(domainResponse => {
      const liveDomains = domainResponse.domains.map(domain => domain.name).filter(Boolean);
      if (liveDomains.length) setDomains(liveDomains);
    }).catch(() => {});
    api.getMySpecialistProfile().then(({ specialist: p }) => {
      setDomains(current => current.includes(p.domain) ? current : [p.domain, ...current]);
      setProfile(p);
      setForm({
        name: p.user.name, image: p.user.image || "", bio: p.user.bio || "", domain: p.domain,
        headline: p.headline || "", qualification: p.qualification || "", experience: p.experience || "",
        howIHelp: p.howIHelp || "",
        expertise: p.expertise.map((name, index) => `${name} | ${p.expertiseDescriptions[index] || ""}`).join("\n"),
        languages: p.languages.join(", "), sessionFormats: p.sessionFormats.length ? p.sessionFormats : ["Video"],
        sessionRate: p.sessionRate ?? 0, sessionDuration: p.sessionDuration,
      });
    }).catch((e) => setError(e.message));
  }, []);

  const field = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  const toggleFormat = (value: string) => field("sessionFormats", form.sessionFormats.includes(value) ? form.sessionFormats.filter((x: string) => x !== value) : [...form.sessionFormats, value]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    const expertiseLines = form.expertise.split("\n").map((line: string) => line.trim()).filter(Boolean);
    try {
      const result = await api.updateMySpecialistProfile({
        ...form,
        expertise: expertiseLines.map((line: string) => line.split("|")[0].trim()),
        expertiseDescriptions: expertiseLines.map((line: string) => line.split("|").slice(1).join("|").trim()),
        languages: form.languages.split(",").map((item: string) => item.trim()).filter(Boolean),
      });
      setProfile(result.specialist);
      updateCurrentProfile(result.specialist.user);
      setMessage("Your professional profile has been saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your profile"); }
    finally { setSaving(false); }
  }

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) { setError("Choose a JPG or PNG profile photo"); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Profile photos must be 2 MB or smaller"); return; }
    setUploadingPhoto(true); setError(""); setMessage("");
    try {
      const { user } = await api.uploadProfilePhoto(file);
      field("image", user.image);
      setProfile(current => current ? { ...current, user } : current);
      updateCurrentProfile(user);
      setMessage("Your profile photo has been saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not upload profile photo"); }
    finally { setUploadingPhoto(false); }
  }

  async function uploadDocument(event: React.ChangeEvent<HTMLInputElement>) {
    const document = event.target.files?.[0]; if (!document) return;
    setUploadingDocument(true); setError(""); setMessage("");
    try { await api.uploadVerificationDocument(document); setMessage("Verification document submitted for admin review."); setProfile((current) => current ? { ...current, verification: "PENDING", verificationDocumentName: document.name } : current); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not upload verification document"); }
    finally { setUploadingDocument(false); }
  }

  if (!profile && !error) return <div className="apiState">Loading profile...</div>;
  return <div className="learnerPage">
    <section className="pageTitle"><div><p className="pageKicker">PROFESSIONAL PROFILE</p><h1>What learners see</h1><p>Keep your information specific, current, and useful to the people deciding to book you.</p></div><span className={`profileStatus ${profile?.verification.toLowerCase()}`}>{profile?.verification}</span></section>
    {error && <div className="formAlert error">{error}</div>}{message && <div className="formAlert success"><Icon name="check" size={16}/>{message}</div>}
    <form className="specialistProfileForm" onSubmit={save}>
      <section className="panel profileEditorSection">
        <div className="editorSectionTitle"><span>1</span><div><h2>Identity and positioning</h2><p>Introduce your practice clearly.</p></div></div>
        <div className="photoField"><div className="profilePhotoLarge">{form.image ? <img src={assetUrl(form.image)} alt=""/> : form.name?.[0]}</div><div><label className="outlineAction">{uploadingPhoto ? "Uploading..." : "Change profile photo"}<input hidden type="file" accept="image/jpeg,image/png" disabled={uploadingPhoto || saving} onChange={choosePhoto}/></label><p>Square JPG or PNG, maximum 2 MB.</p></div></div>
        <div className="verificationUpload"><div><b>Verification credential</b><p>{profile?.verificationDocumentName || "No credential is stored for this account yet."}</p></div><label className="outlineAction">{uploadingDocument ? "Uploading..." : profile?.verificationDocumentName ? "Replace document" : "Upload document"}<input hidden type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={uploadDocument} disabled={uploadingDocument}/></label></div>
        <div className="formTwo"><label>Professional name<input required value={form.name || ""} onChange={(e) => field("name", e.target.value)}/></label><label>Specialty<select required value={form.domain || ""} onChange={(e) => field("domain", e.target.value)}>{domains.map((x) => <option key={x}>{x}</option>)}</select></label></div>
        <label>Professional headline<input required maxLength={90} value={form.headline || ""} onChange={(e) => field("headline", e.target.value)} placeholder="e.g. Career strategist for early-career professionals"/></label>
        <label>Short bio<textarea required value={form.bio || ""} onChange={(e) => field("bio", e.target.value)} placeholder="A concise summary of who you help and your approach."/></label>
      </section>
      <section className="panel profileEditorSection">
        <div className="editorSectionTitle"><span>2</span><div><h2>How you help</h2><p>This content appears directly on your public profile.</p></div></div>
        <label>How I can help<textarea value={form.howIHelp || ""} onChange={(e) => field("howIHelp", e.target.value)} placeholder="Describe how sessions work and what learners can expect."/></label>
        <label>Areas of expertise<textarea className="expertiseEditor" value={form.expertise || ""} onChange={(e) => field("expertise", e.target.value)} placeholder={"Career planning | A structured approach tailored to personal goals.\nCV review | Practical feedback and an achievable action plan.\nInterview prep | Support that builds clarity and confidence."}/><small>Add one area per line. Put a | between its title and learner-facing description.</small></label>
        <label>Qualifications<input value={form.qualification || ""} onChange={(e) => field("qualification", e.target.value)} placeholder="Degrees, certifications, or professional credentials"/></label>
      </section>
      <section className="panel profileEditorSection">
        <div className="editorSectionTitle"><span>3</span><div><h2>Professional details and booking</h2><p>Set accurate expectations before a learner books.</p></div></div>
        <div className="formTwo"><label>Experience<input value={form.experience || ""} onChange={(e) => field("experience", e.target.value)} placeholder="e.g. 12 years"/></label><label>Languages<input value={form.languages || ""} onChange={(e) => field("languages", e.target.value)} placeholder="English, French"/></label><label>Session rate (FCFA)<input type="number" min="0" required value={form.sessionRate ?? 0} onChange={(e) => field("sessionRate", Number(e.target.value))}/></label><label>Session duration<select value={form.sessionDuration || 45} onChange={(e) => field("sessionDuration", Number(e.target.value))}>{[30,45,60,90].map((x) => <option value={x} key={x}>{x} minutes</option>)}</select></label></div>
        <fieldset><legend>Session formats</legend><div className="formatOptions">{["Video","Chat","In-person"].map((x) => <label key={x} className={form.sessionFormats?.includes(x) ? "selected" : ""}><input type="checkbox" checked={form.sessionFormats?.includes(x) || false} onChange={() => toggleFormat(x)}/><Icon name={x === "Video" ? "video" : x === "Chat" ? "message" : "users"}/>{x}</label>)}</div></fieldset>
      </section>
      <div className="stickySave"><div><b>Profile changes</b><p>Review your details before publishing updates.</p></div><button className="learnerPrimary" disabled={saving || uploadingPhoto}>{saving ? "Saving..." : "Save profile"}</button></div>
    </form>
    <ChangePasswordForm />
  </div>;
}
