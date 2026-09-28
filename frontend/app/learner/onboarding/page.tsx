"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api, LearnerPreferences, LearnerPreferenceOptions } from "@/lib/api";
import { logout } from "@/lib/store";
import "./onboarding.css";

const empty: LearnerPreferences = { interests: [], goals: [], formats: [], stage: "", aspiration: "", completedAt: null };
const headings = ["What sparks your interest?", "What would you like to achieve?", "How would you like to learn?"];
const descriptions = [
  "Choose the areas you would like guidance in. You can pick more than one.",
  "Tell us where you are now and what you hope to get from Learnova.",
  "Choose your preferred learning format. Our AI engine will instantly generate personalized specialist recommendations for you."
];

export default function OnboardingPage() {
  const [values, setValues] = useState(empty);
  const [options, setOptions] = useState<LearnerPreferenceOptions | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let active = true;
    setError("");
    api.getLearnerPreferences().then(({ profile, options }) => {
      if (!active) return;
      setOptions(options);
      if (profile) {
        setValues(profile);
        if (!profile.completedAt) setStep(!profile.interests.length ? 0 : !profile.goals.length || !profile.stage ? 1 : 2);
      }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => { if (options) heading.current?.focus(); }, [step, options]);

  function choices(key: "interests" | "goals" | "formats", label: string) {
    return <fieldset className="onboardChoices"><legend>{label}</legend><div>{options?.[key].map(item => <label key={item} className={values[key].includes(item) ? "selected" : ""}>
      <input type="checkbox" checked={values[key].includes(item)} onChange={() => { setError(""); setValues(v => ({ ...v, [key]: v[key].includes(item) ? v[key].filter(x => x !== item) : [...v[key], item] })); }} />
      <span>{item}</span>
    </label>)}</div></fieldset>;
  }

  async function next(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (step === 0 && !values.interests.length) { setError("Choose at least one area that interests you."); return; }
    if (step === 1 && (!values.goals.length || !values.stage)) { setError("Choose your current stage and at least one goal."); return; }
    if (step === 2 && !values.formats.length) { setError("Choose at least one way you would like to learn."); return; }
    pending.current = true; setBusy(true); setError("");
    try {
      await api.saveLearnerPreferences({ ...values, complete: step === 2 });
      if (step === 2) window.location.assign(values.completedAt ? "/learner/profile" : "/learner");
      else setStep(s => s + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save your choices. Please try again."); }
    finally { pending.current = false; setBusy(false); }
  }

  function skipForNow() {
    window.location.assign("/learner");
  }

  return <main className="onboardPage">
    <header className="onboardHeader">
      <Link href="/" className="onboardBrand" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
        <img src="/logo.png" alt="Learnova Logo" style={{ height: "42px", width: "auto", objectFit: "contain", borderRadius: "6px", background: "#ffffff", padding: "2px 6px" }} />
      </Link>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button type="button" onClick={skipForNow} disabled={busy}>Skip for now</button>
        <button onClick={logout} disabled={busy}>Sign out</button>
      </div>
    </header>
    <div className="onboardLayout">
      <aside className="onboardIntro"><p className="onboardEyebrow">YOUR NEXT CHAPTER</p><h1>A little about you.<br />A better place to begin.</h1><p>Your interests and goals help us match you with the best verified specialists.</p><ol>{["Your interests", "Your goals", "Your learning style"].map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined} className={step >= i ? "active" : ""}><span>{i < step ? "✓" : i + 1}</span>{label}</li>)}</ol><small>You can update your answers from your profile whenever your plans change.</small></aside>
      <section className="onboardCard">
        {!options ? <div aria-live="polite">{error ? <><p role="alert">{error}</p><button onClick={() => setAttempt(n => n + 1)}>Try again</button></> : "Loading your preferences..."}</div> : <>
          <p className="onboardEyebrow">{values.completedAt ? "UPDATE YOUR PREFERENCES" : "LET'S MAKE THIS YOURS"} · STEP {step + 1} OF 3</p>
          <div className="onboardProgress" aria-hidden="true"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
          <h2 ref={heading} tabIndex={-1}>{headings[step]}</h2><p className="onboardDescription">{descriptions[step]}</p>
          <form onSubmit={next}><fieldset className="onboardFields" disabled={busy}>
            {step === 0 && choices("interests", "I'm interested in")}
            {step === 1 && <><label className="onboardLabel" htmlFor="learning-stage">Where are you in your journey?</label><select id="learning-stage" value={values.stage} onChange={e => setValues(v => ({ ...v, stage: e.target.value }))}><option value="">Choose your current stage</option>{options.stage.map(item => <option key={item}>{item}</option>)}</select>{choices("goals", "I'm here to")}</>}
            {step === 2 && <>{choices("formats", "I'd like to try")}<label className="onboardLabel" htmlFor="learning-aspiration">What would progress look like for you? <small>(optional)</small></label><textarea id="learning-aspiration" rows={4} maxLength={500} value={values.aspiration} onChange={e => setValues(v => ({ ...v, aspiration: e.target.value }))} placeholder="For example: feel confident choosing a career path over the next three months." /><small className="onboardCount">{values.aspiration.length}/500 · Only share what you are comfortable with.</small></>}
            {error && <p className="onboardError" role="alert">{error}</p>}
            <div className="onboardActions">{step > 0 && <button type="button" onClick={() => { setStep(s => s - 1); setError(""); }}>Back</button>}<button className="onboardPrimary" type="submit">{busy ? "Saving..." : step === 2 ? values.completedAt ? "Save preferences" : "✦ Save & View AI Recommendations" : "Save & continue"}</button></div>
            <p className="onboardFootnote"><button type="button" className="onboardSkipLink" onClick={skipForNow}>Skip for now</button></p>
          </fieldset></form><p className="onboardFootnote">Your answers are saved when you continue.</p>
        </>}
      </section>
    </div>
  </main>;
}
