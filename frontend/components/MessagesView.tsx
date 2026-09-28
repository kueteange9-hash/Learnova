"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { api, ChatContact, ChatMessage } from "@/lib/api";
import { assetUrl } from "@/lib/assets";
import "./messages.css";

function MessagesContent({ role }: { role: "learner" | "specialist" }) {
  const params = useSearchParams();
  const selected = params.get("contact") || "";
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactError, setContactError] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const result = await api.getChatContacts();
        if (active) { setContacts(result.contacts); setContactError(""); }
      } catch (e) { if (active) setContactError(e instanceof Error ? e.message : "Could not load conversations"); }
      finally { if (active) { setLoading(false); timer = setTimeout(refresh, 3000); } }
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, []);
  const contact = contacts.find(c => c.id === selected);
  return <div className="learnerPage">
    <section className="pageTitle"><div><p className="pageKicker">STAY CONNECTED</p><h1>Messages</h1><p>Chat with your {role === "learner" ? "specialists" : "learners"}.</p></div></section>
    {contactError && <p className="formAlert error" role="alert">{contactError} — retrying automatically.</p>}
    <div className={`chatLayout panel ${selected ? "chatSelected" : ""}`}>
      <aside className="chatContacts" aria-label="Conversations">
        <label className="chatSearch">Find a conversation<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name" /></label>
        {loading ? <p className="chatHint">Loading conversations...</p> : contacts.length === 0 ? <p className="chatHint">{role === "learner" ? "Specialists will appear here when available." : "Learners appear here when they book a session or send you a message."}</p> : null}
        {contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).map(c => <Link href={`/${role}/messages?contact=${encodeURIComponent(c.id)}`} key={c.id} className={`chatContact ${selected === c.id ? "active" : ""}`} aria-current={selected === c.id ? "page" : undefined}>
          <span className="chatAvatar">{c.image ? <img src={assetUrl(c.image)} alt="" /> : c.name.slice(0, 1)}</span>
          <span className="chatContactText"><b>{c.name}</b><small>{c.lastMessage?.text || "Start a conversation"}</small></span>
          {c.unread > 0 && <span className="chatUnread" aria-label={`${c.unread} unread messages`}>{c.unread}</span>}
        </Link>)}
      </aside>
      {contact ? <Thread key={contact.id} contact={contact} role={role} /> : <section className="chatEmpty"><h2>{selected && !loading ? "Contact unavailable" : "Your conversations"}</h2><p>Select a contact to start chatting.</p>{role === "learner" && <Link href="/learner/specialists" className="outlineAction">Find a specialist</Link>}<Link className="chatBack" href={`/${role}/messages`}>Back to conversations</Link></section>}
    </div>
  </div>;
}

function Thread({ contact, role }: { contact: ChatContact; role: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [canMessage, setCanMessage] = useState(role !== "learner");
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const active = useRef(true);
  const merge = (incoming: ChatMessage[]) => setMessages(previous => {
    const byId = new Map(previous.map(m => [m.id, m]));
    incoming.forEach(m => byId.set(m.id, m));
    return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  });
  useEffect(() => {
    if (role === "learner") {
      api.getFollowing()
        .then((result) => {
          setCanMessage(result.specialistIds.includes(contact.id));
        })
        .catch(() => {
          setCanMessage(false);
        });
    }
  }, [contact.id, role]);

  useEffect(() => {
    active.current = true;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    let first = true;
    async function refresh() {
      try {
        const result = await api.getMessages(contact.id);
        if (!live) return;
        merge(result.messages);
        if (first) { setHasMore(result.hasMore); first = false; }
        if (document.visibilityState === "visible") {
          const ids = result.messages.filter(m => m.senderId === contact.id && !m.read).map(m => m.id);
          if (ids.length) await api.readMessages(contact.id, ids);
        }
        if (live) setError("");
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "Could not load messages"); }
      finally { if (live) { setLoading(false); timer = setTimeout(refresh, 3000); } }
    }
    refresh();
    return () => { live = false; active.current = false; clearTimeout(timer); };
  }, [contact.id]);
  useEffect(() => {
    if (atBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);
  async function older() {
    setOlderLoading(true);
    try {
      const result = await api.getMessages(contact.id, messages[0]?.id);
      if (!active.current) return;
      atBottom.current = false;
      merge(result.messages); setHasMore(result.hasMore);
      const ids = result.messages.filter(m => m.senderId === contact.id && !m.read).map(m => m.id);
      if (ids.length) await api.readMessages(contact.id, ids);
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : "Could not load older messages"); }
    finally { if (active.current) setOlderLoading(false); }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!canMessage) {
      setSendError("You must subscribe to this specialist before sending a message.");
      return;
    }
    if (!draft.trim() || sending) return;
    setSending(true); setSendError("");
    try {
      const result = await api.sendMessage(contact.id, draft);
      if (!active.current) return;
      atBottom.current = true; merge([result.message]); setDraft("");
    } catch (e) { if (active.current) setSendError(e instanceof Error ? e.message : "Could not send message"); }
    finally { if (active.current) setSending(false); }
  }
  return <section className="chatThread" aria-label={`Conversation with ${contact.name}`}>
    <header className="chatHeader"><Link href={`/${role}/messages`} className="chatBack">Back</Link><div><h2>{contact.name}</h2><small>{contact.role === "SPECIALIST" ? "Specialist" : "Learner"}</small></div></header>
    {error && <p className="formAlert error" role="alert">{error} — retrying automatically.</p>}
    {role === "learner" && !canMessage && <p className="formAlert error" role="alert">Follow this specialist first before sending a private message.</p>}
    <div className="chatMessages" ref={list} onScroll={() => { const el = list.current; if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {hasMore && <button className="outlineAction" onClick={older} disabled={olderLoading}>{olderLoading ? "Loading..." : "Load older messages"}</button>}
      {loading ? <p className="chatHint">Loading messages...</p> : messages.length === 0 && !error ? <p className="chatHint">Say hello to {contact.name} to start your conversation.</p> : null}
      {messages.map(m => <article key={m.id} className={`chatBubble ${m.senderId !== contact.id ? "outgoing" : "incoming"}`}><p>{m.text}</p><time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></article>)}
    </div>
    {sendError && <p className="formAlert error" role="alert">{sendError}</p>}
    <form className="chatComposer" onSubmit={send}>
      <label htmlFor="chat-draft" className="chatComposerLabel">Message</label>
      <textarea id="chat-draft" value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} disabled={sending || (role === "learner" && !canMessage)} placeholder={role === "learner" && !canMessage ? "Follow this specialist to unlock messaging" : "Write a message..."} rows={2} />
      <button className="learnerPrimary" disabled={sending || !draft.trim() || (role === "learner" && !canMessage)}>{sending ? "Sending..." : "Send"}</button>
      <small>{draft.length}/4,000</small>
    </form>
  </section>;
}

export default function MessagesView({ role }: { role: "learner" | "specialist" }) {
  return <Suspense fallback={<div className="apiState">Loading messages...</div>}><MessagesContent role={role} /></Suspense>;
}
