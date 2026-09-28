"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api } from "@/lib/api";
import { setAuthenticatedUser } from "@/lib/store";
import "./auth.css";

type Fields = "name" | "email" | "password" | "confirm";
const fallbackDomains = ["Career Guidance", "Academic Guidance", "Mental Wellbeing", "Entrepreneurship", "Agriculture", "Personal Development"];

export default function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const [role, setRole] = useState<"LEARNER" | "SPECIALIST">("LEARNER");
  const [domains, setDomains] = useState(fallbackDomains);
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const [domain, setDomain] = useState(domains[0]);
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const pending = useRef(false);

  useEffect(() => {
    api.getDomains().then(result => {
      const liveDomains = result.domains.map(domain => domain.name).filter(Boolean);
      if (liveDomains.length) {
        setDomains(liveDomains);
        setDomain(current => liveDomains.includes(current) ? current : liveDomains[0]);
      }
    }).catch(() => {});
  }, []);

  function change(field: Fields, value: string) {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current || created) return;
    const next: Partial<Record<Fields, string>> = {};
    if (register && (values.name.trim().length < 2 || values.name.trim().length > 100)) next.name = "Enter your full name (2–100 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > 254) next.email = "Enter a valid email address.";
    if (!values.password) next.password = "Enter your password.";
    else if (register && (values.password.length < 8 || new TextEncoder().encode(values.password).length > 72)) next.password = "Use at least 8 characters. Your password must fit within 72 bytes.";
    if (register && values.confirm !== values.password) next.confirm = "Your passwords do not match.";
    setErrors(next); setError("");
    const first = Object.keys(next)[0];
    if (first) { form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus(); return; }
    if (register && role === "SPECIALIST" && !verificationDocument) { setError("Upload a PDF, JPG, or PNG credential before creating a specialist account."); form.current?.querySelector<HTMLInputElement>("[name=verificationDocument]")?.focus(); return; }
    pending.current = true; setBusy(true);
    let accountCreated = false;
    try {
      const credentials = { email: values.email.trim().toLowerCase(), password: values.password };
      const result = register
        ? await api.register({ ...credentials, name: values.name.trim(), role, ...(role === "SPECIALIST" ? { domain, verificationDocument: verificationDocument || undefined } : {}) })
        : await api.login(credentials);
      if (!result?.success || !result.token || !result.user) throw new Error(result?.message || "We couldn't complete your request. Please try again.");
      accountCreated = register;
      setAuthenticatedUser(result.user, result.token);
      window.location.assign(
        result.user.role === "ADMIN"
          ? "/admin"
          : result.user.role === "SPECIALIST"
          ? (register ? "/specialist/profile" : "/specialist")
          : (register ? "/learner/onboarding" : "/learner")
      );
    } catch (e) {
      if (accountCreated) {
        setCreated(true);
        setError("Your account was created, but we couldn't save your session. Allow browser storage, then sign in.");
      } else setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false); pending.current = false;
    }
  }

  const field = (name: Fields, label: string, type: string, placeholder: string, autoComplete: string) => <div className="authField">
    <label htmlFor={`auth-${name}`}>{label}</label>
    <div className={name === "password" ? "authPassword" : undefined}>
      <input id={`auth-${name}`} name={name} type={name === "password" && visible ? "text" : type} value={values[name]} onChange={e => change(name, e.target.value)} autoComplete={autoComplete} placeholder={placeholder} required aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `error-${name}` : name === "password" && register ? "password-help" : undefined} maxLength={name === "name" ? 100 : name === "email" ? 254 : undefined} />
      {name === "password" && <button type="button" className="authReveal" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>{visible ? "Hide" : "Show"}</button>}
    </div>
    {errors[name] ? <small className="authFieldError" id={`error-${name}`}>{errors[name]}</small> : name === "password" && register ? <small id="password-help" className="authFieldHint">At least 8 characters. A longer, unique password is best.</small> : null}
  </div>;

  return <main className="authExperience">
    <aside className="authSide">
      <Link href="/" className="authBrand"><img src="/logo.png" alt="Learnova Logo" style={{ height: "85px", width: "auto", objectFit: "contain", background: "#ffffff", borderRadius: "10px", padding: "6px 12px" }} /></Link>

      <div className="authSideBody">
        <h1>{register ? "A little guidance changes where you end up." : "Good to have you back."}</h1>
        <p>{register ? "Learnova connects you with real specialists for direct, one-to-one guidance." : "Sign in to pick up your conversations and progress right where you left off."}</p>
      </div>

      <div className="authSideDomains">
        <span className="authSideDomainsLabel">Guidance across</span>
        <ul>{domains.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </aside>

    <section className="authFormPanel">
      <header className="authTopline">
        <Link href="/" className="authBrandCompact"><img src="/logo.png" alt="Learnova Logo" style={{ height: "48px", width: "auto", objectFit: "contain", background: "#ffffff", borderRadius: "8px", padding: "4px 8px" }} /></Link>
        <span>{register ? "Already a member?" : "New here?"} <Link href={register ? "/login" : "/register"}>{register ? "Sign in" : "Join Learnova"}</Link></span>
      </header>

      <div className="authFormContent">
        <div className="authCardHead">
          <h2>{register ? "Create your account" : "Sign in"}</h2>
          <p>{register ? "Fill in your details to get started." : "Enter your details to continue."}</p>
        </div>

        {error && <div className="authError" role="alert"><Icon name="message" size={17} /><div>{error}{created && <Link href="/login">Go to sign in</Link>}</div></div>}

        <form ref={form} onSubmit={submit} noValidate aria-label={register ? "Create an account" : "Sign in"}>
          <fieldset disabled={busy || created} className="authFields">
            {register && <fieldset className="authRoleChoice"><legend>I'm here to</legend><div>{(["LEARNER", "SPECIALIST"] as const).map(value => <label className={role === value ? "chosen" : ""} key={value}>
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} /><span>{value === "LEARNER" ? "Find guidance" : "Offer guidance"}</span>
            </label>)}</div></fieldset>}
            {register && field("name", "Full name", "text", "Your full name", "name")}
            {field("email", "Email address", "email", "you@example.com", "email")}
            {field("password", "Password", "password", register ? "Create a password" : "Enter your password", register ? "new-password" : "current-password")}
            {register && field("confirm", "Confirm password", "password", "Re-enter your password", "new-password")}
            {register && role === "SPECIALIST" && <div className="authSpecialistBlock">
              <div className="authField"><label htmlFor="auth-domain">Area of specialization</label><select id="auth-domain" value={domain} onChange={e => setDomain(e.target.value)}>{domains.map(item => <option key={item}>{item}</option>)}</select></div>
              <div className="authField"><label htmlFor="auth-verificationDocument">Proof of qualification or professional experience</label><input id="auth-verificationDocument" name="verificationDocument" type="file" accept="application/pdf,image/jpeg,image/png" required onChange={event => { const file = event.target.files?.[0] || null; if (file && file.size > 8 * 1024 * 1024) { event.target.value = ""; setVerificationDocument(null); setError("Choose a credential smaller than 8 MB."); } else { setVerificationDocument(file); setError(""); } }} /><small className="authFieldHint">Required for specialist registration. PDF, JPG, or PNG up to 8 MB.</small></div>
              <p className="authVerification">Your credential will be sent to the administrator for review. You can access your dashboard, but your specialist profile and activities remain restricted until approval.</p>
            </div>}
            <button type="submit" className="authSubmit" disabled={busy || created}>{busy ? <><span className="authSpinner" />{register ? "Creating your account…" : "Signing you in…"}</> : <>{register ? "Create account" : "Sign in"}<Icon name="arrow" size={15} /></>}</button>
          </fieldset>
        </form>
      </div>

      <footer className="authPageFooter"><span>© {new Date().getFullYear()} Learnova</span><span>Learn. Connect. Grow.</span></footer>
    </section>
  </main>;
}
