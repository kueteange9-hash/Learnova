"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, WorkshopRecord } from "@/lib/api";
import { assetUrl } from "@/lib/assets";
import Icon from "@/components/learner/Icon";
import { DateTile, Empty, dateLabel, priceLabel } from "@/components/workshops/shared";

export default function LearnerWorkshopsPage() {
  const [items, setItems] = useState<WorkshopRecord[]>([]);
  const [registered, setRegistered] = useState<string[]>([]);
  const [tab, setTab] = useState("browse");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<WorkshopRecord | null>(null);
  const [step, setStep] = useState("details");
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"MOMO" | "OM">("MOMO");
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    Promise.all([api.getWorkshops(), api.getMyRegisteredWorkshops()])
      .then(([all, mine]) => { setItems(all.workshops.map(w => mine.workshops.find(m => m.id === w.id) || w)); setRegistered(mine.workshops.map(w => w.id)); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (selected) heading.current?.focus(); }, [selected, step]);

  const paymentWorkshopId = selected?.id;
  useEffect(() => {
    if (step !== "pending" || !paymentWorkshopId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const deadline = Date.now() + 5 * 60 * 1000;
    async function poll() {
      try {
        const result = await api.checkWorkshopPayment(paymentWorkshopId!, AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]));
        if (cancelled) return;
        if (result.registration.paymentStatus === "COMPLETED" && result.registration.status === "REGISTERED") {
          const mine = await api.getMyRegisteredWorkshops();
          if (cancelled) return;
          setRegistered(mine.workshops.map(w => w.id));
          setItems(items => items.map(w => mine.workshops.find(m => m.id === w.id) || w));
          setSelected(current => mine.workshops.find(w => w.id === paymentWorkshopId) || current);
          setError("");
          setStep("success");
          return;
        }
        if (result.registration.paymentStatus !== "PENDING") {
          setError("Payment was not completed. Your place has not been reserved. Contact support for help.");
          setStep("payment-error");
          return;
        }
        setError("");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && [400, 401, 403, 404, 409].includes(error.status)) {
          setError(error.status === 404 ? "Payment verification is unavailable. Contact support before paying again." : error.message);
          setStep("payment-error");
          return;
        }
        setError("Connection interrupted. We are automatically retrying payment verification. Please do not pay again.");
      }
      if (Date.now() >= deadline) {
        setError("Payment confirmation is taking longer than expected. Please contact support before paying again.");
        setStep("payment-error");
        return;
      }
      timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [step, paymentWorkshopId]);

  function back() { setSelected(null); setError(""); requestAnimationFrame(() => origin.current?.focus()); }
  async function register() {
    if (!selected || lock.current || step === "pending" || step === "payment-error") return;
    if (step !== "pending" && selected.type === "PAID" && !phone.trim()) {
       setStep("checkout");
       setError("Please enter your mobile money phone number to proceed.");
       return;
    }
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await api.registerForWorkshop(selected.id, selected.type === "PAID" ? paymentMethod : "MOMO", phone);
      if (result.registration.paymentStatus === "COMPLETED" && result.registration.status === "REGISTERED") {
        const mine = await api.getMyRegisteredWorkshops();
        setRegistered(mine.workshops.map(w => w.id));
        setItems(items => items.map(w => mine.workshops.find(m => m.id === w.id) || w));
        setSelected(mine.workshops.find(w => w.id === selected.id) || selected);
        setStep("success");
      } else {
        setStep("pending");
        if ("message" in result && typeof result.message === "string") setError(result.message);
        if (result.registration.paymentStatus === "FAILED") { setStep("payment-error"); setError("Payment failed. Your place has not been reserved. Contact support for help."); }
      }
    }
    catch (e) { setError(e instanceof Error ? e.message : "Registration failed. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  const visible = items.filter(w => (tab === "mine" ? registered.includes(w.id) : new Date(w.date).getTime() > Date.now()) && (filter === "ALL" || w.type === filter) && `${w.title} ${w.specialist.name}`.toLowerCase().includes(query.toLowerCase()));

  if (selected) {
    const joined = registered.includes(selected.id);
    const past = new Date(selected.date).getTime() <= Date.now();
    return <div className="learnerPage ws-page">
      <button className="ws-back" disabled={busy} onClick={back}>&larr; Back to workshops</button>
      <div className="ws-detail-grid">
        <section className="ws-surface ws-detail">
          <p className="ws-eyebrow">{step === "pending" ? "PAYMENT PENDING" : step === "success" ? "REGISTRATION CONFIRMED" : step === "checkout" ? "REGISTRATION" : "ONLINE WORKSHOP"}</p>
          <h1 ref={heading} tabIndex={-1}>{step === "pending" ? "Waiting for payment confirmation" : step === "success" ? "Your place is reserved." : step === "checkout" ? "Review your registration" : selected.title}</h1>
          {step === "pending" ? <div className="ws-notice" role="status"><span className="ws-spinner" aria-hidden="true" /> Approve the payment request on your phone. We are waiting for confirmation and will reserve your place automatically once payment is verified.</div> : step === "payment-error" ? <p>Your registration is not confirmed.</p> : step === "success" ? <><p>You're registered for <strong>{selected.title}</strong>. Find this session anytime in My workshops.</p><div className="ws-notice">{selected.meetingUrl ? "Your meeting link is ready. Use the button below when it’s time to join." : "Your host will add the meeting link here before the session. Check My workshops closer to the start time."}</div><button className="ws-primary" onClick={() => { setTab("mine"); back(); }}>Go to my workshops</button></> : <>
            <p className="ws-host">Hosted by <strong>{selected.specialist.name}</strong></p>
            <div className="ws-facts"><span><Icon name="calendar" size={18} />{dateLabel(selected.date)}</span><span><Icon name="video" size={18} />Online session</span></div>
            {step === "details" ? <><h2>About this workshop</h2><p className="ws-description">{selected.description}</p><h2>How to join</h2><p>Register to reserve your place. Your workshop and meeting link will appear in My workshops.</p>{selected.type === "PAID" && <div className="ws-payment-form"><p>Enter your Mobile Money number to pay <strong>{priceLabel(selected)}</strong></p><div style={{display: "flex", gap: "10px", margin: "15px 0"}}><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} style={{padding: "10px", borderRadius: "8px", border: "1px solid #ccc"}}><option value="MOMO">MTN Mobile Money</option><option value="OM">Orange Money</option></select><input type="tel" aria-label="Mobile Money phone number" placeholder="Phone number (e.g. 670000000)" value={phone} onChange={e => setPhone(e.target.value)} style={{flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc"}} /></div><p style={{fontSize: "0.85rem", color: "#666"}}>You will receive a prompt on your phone to confirm the payment via Campay.</p></div>}</> : <><h2>{selected.type === "PAID" ? "Payment" : "Reserve your place"}</h2>{selected.type === "PAID" ? <div className="ws-payment-form"><p>Enter your Mobile Money number to pay <strong>{priceLabel(selected)}</strong></p><div style={{display: "flex", gap: "10px", margin: "15px 0"}}><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} style={{padding: "10px", borderRadius: "8px", border: "1px solid #ccc"}}><option value="MOMO">MTN Mobile Money</option><option value="OM">Orange Money</option></select><input type="tel" aria-label="Mobile Money phone number" placeholder="Phone number (e.g. 670000000)" value={phone} onChange={e => setPhone(e.target.value)} style={{flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc"}} /></div><p style={{fontSize: "0.85rem", color: "#666"}}>You will receive a prompt on your phone to confirm the payment via Campay.</p></div> : <p>This workshop is free. Confirm below to add it to your workshops.</p>}<button className="ws-back" onClick={() => setStep("details")}>&larr; Workshop details</button></>}
          </>}
          {error && <div className="ws-error" role="alert">{error}</div>}
        </section>
        <aside className="ws-surface ws-summary">
          <DateTile date={selected.date} /><h2>{selected.title}</h2><p>{dateLabel(selected.date)}</p><small>Times shown in your local timezone.</small>
          <dl><div><dt>Admission</dt><dd>1 person</dd></div><div className="ws-total"><dt>Total</dt><dd>{priceLabel(selected)}</dd></div></dl>
          {step === "checkout" && selected.type === "PAID" && <div className="ws-summary-payment">
            <label>Mobile Money provider<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as "MOMO" | "OM")}><option value="MOMO">MTN Mobile Money</option><option value="OM">Orange Money</option></select></label>
            <label>Mobile Money phone number<input type="tel" inputMode="numeric" placeholder="e.g. 670000000" value={phone} onChange={e => setPhone(e.target.value)} /><small>Enter the 9-digit number without +237.</small></label>
          </div>}
          {step === "pending" ? <div className="ws-payment-wait" role="status"><span className="ws-spinner" aria-hidden="true" /> Waiting for payment confirmation?</div> : step === "payment-error" ? <p>Payment not confirmed</p> : joined ? <><span className="ws-status">Registered</span>{selected.meetingUrl ? <a className="ws-primary" href={selected.meetingUrl} target="_blank" rel="noopener noreferrer">Join workshop <Icon name="arrow" size={16} /></a> : <p>{past ? "This session has already started or ended." : "Meeting link will appear here when your host adds it."}</p>}</> : step === "details" ? <button className="ws-primary" disabled={past} onClick={() => setStep("checkout")}>{past ? "Registration closed" : selected.type === "PAID" ? "Continue to payment" : "Register for free"}<Icon name="arrow" size={16} /></button> : <button className="ws-primary" disabled={busy} onClick={register}>{busy ? "Processing…"  : selected.type === "PAID" ? "Pay & Register" : "Confirm free registration"}</button>}
        </aside>
      </div>
    </div>;
  }

  return <div className="learnerPage ws-page">
    <header className="ws-heading"><div><h1>Workshops</h1><p>Make time to learn, ask questions, and connect with a specialist.</p></div></header>
    <div className="ws-tabs" aria-label="Workshop views">{[["browse", "Explore workshops"], ["mine", `My workshops (${registered.length})`]].map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    <div className="ws-tools"><label className="ws-search"><Icon name="search" size={18}/><input aria-label="Search workshops" placeholder="Search by topic or host" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Filter by price" value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">Any price</option><option value="FREE">Free</option><option value="PAID">Paid</option></select></div>
    {error && <div className="ws-error" role="alert">{error}</div>}
    {loading ? <div className="ws-empty" role="status">Loading workshops…</div> : visible.length ? <><p className="ws-result-count">{visible.length} {visible.length === 1 ? "workshop" : "workshops"}{tab === "browse" ? " coming up" : " registered"}</p><div className="ws-catalog">{visible.map(w => <article className="ws-surface ws-card" key={w.id}>
      {w.image && <img className="ws-cover" src={assetUrl(w.image)} alt=""/>}
      <div className="ws-card-content"><div className="ws-card-top"><DateTile date={w.date}/><span className="ws-status">{registered.includes(w.id) ? "Registered" : "Online workshop"}</span></div><h2>{w.title}</h2><p className="ws-host">with {w.specialist.name}</p><p className="ws-excerpt">{w.description}</p><p className="ws-time"><Icon name="clock" size={15}/>{dateLabel(w.date)}</p><footer><strong>{priceLabel(w)}</strong><button className="ws-secondary" onClick={e => { origin.current = e.currentTarget; setSelected(w); setStep("details"); setError(""); }}>View {tab === "mine" ? "registration" : "details"}<Icon name="arrow" size={16}/></button></footer></div>
    </article>)}</div></> : <Empty title={query || filter !== "ALL" ? "No matching workshops" : tab === "mine" ? "Your next session starts here" : "More workshops are on the way"}>{query || filter !== "ALL" ? "Try a different search or price filter." : tab === "mine" ? "Explore upcoming workshops and register for a session that interests you." : "Check back soon for new sessions from our specialists."}</Empty>}
  </div>;
}
