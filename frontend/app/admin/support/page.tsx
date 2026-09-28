"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api, SupportTicketRecord } from "@/lib/api";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      const res = await api.getAdminSupportTickets();
      setTickets(res.tickets);
    } catch (err: any) {
      setError(err.message || "Could not load support requests.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: "OPEN" | "IN_PROGRESS" | "RESOLVED") {
    setUpdatingId(id);
    try {
      const res = await api.updateAdminSupportTicketStatus(id, newStatus);
      setTickets(prev => prev.map(t => (t.id === id ? res.ticket : t)));
    } catch (err: any) {
      alert(err.message || "Failed to update ticket status");
    } finally {
      setUpdatingId(null);
    }
  }

  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === "OPEN").length;
  const inProgressCount = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter(t => t.status === "RESOLVED").length;

  const visibleTickets = tickets.filter(t => {
    const matchesFilter = filter === "ALL" ? true : t.status === filter;
    const matchesSearch =
      !search ||
      `${t.name} ${t.email} ${t.subject} ${t.message} ${t.category}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="adminSupportPage">
        <section className="dashboardHello">
          <div>
            <p className="pageKicker">PLATFORM SUPPORT & FEEDBACK</p>
            <h1>Help & Support Management</h1>
            <p>Monitor, respond to, and resolve user technical questions and feedback across Learnova.</p>
          </div>
          <button onClick={loadTickets} className="outlineAction" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon name="check" size={16} /> Refresh Requests
          </button>
        </section>

        {/* Stats Summary Cards */}
        <section className="adminSupportStats">
          <article>
            <span className="statIcon purple">
              <Icon name="message" />
            </span>
            <div>
              <strong>{totalCount}</strong>
              <p>Total Requests</p>
            </div>
          </article>

          <article>
            <span className="statIcon orange">
              <Icon name="clock" />
            </span>
            <div>
              <strong>{openCount}</strong>
              <p>Open / Pending</p>
            </div>
          </article>

          <article>
            <span className="statIcon blue">
              <Icon name="sparkles" />
            </span>
            <div>
              <strong>{inProgressCount}</strong>
              <p>In Progress</p>
            </div>
          </article>

          <article>
            <span className="statIcon green">
              <Icon name="check" />
            </span>
            <div>
              <strong>{resolvedCount}</strong>
              <p>Resolved Tickets</p>
            </div>
          </article>
        </section>

        {/* Filters and Search Bar */}
        <div className="supportFilterBar">
          <div className="filterChips">
            {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const).map(s => (
              <button
                key={s}
                className={`filterChip ${filter === s ? "active" : ""}`}
                onClick={() => setFilter(s)}
              >
                {s === "ALL" ? "All Tickets" : s === "IN_PROGRESS" ? "In Progress" : s.charAt(0) + s.slice(1).toLowerCase()}
                {s === "OPEN" && openCount > 0 && ` (${openCount})`}
              </button>
            ))}
          </div>

          <div className="directorySearch" style={{ width: "280px" }}>
            <Icon name="search" size={17} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search user, subject, message..."
            />
          </div>
        </div>

        {error && (
          <div className="formAlert error" role="alert">
            <Icon name="close" size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="apiState">Loading support tickets...</div>
        ) : visibleTickets.length === 0 ? (
          <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
            <Icon name="message" size={36} />
            <h3 style={{ margin: "14px 0 6px", color: "var(--text-main)", fontSize: "1.1rem" }}>
              No support requests found
            </h3>
            <p style={{ fontSize: "0.9rem" }}>
              {search || filter !== "ALL"
                ? "No support tickets match your search or status filter."
                : "No support feedback or help requests have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="ticketCardList">
            {visibleTickets.map(t => (
              <article className="ticketCard" key={t.id}>
                <div className="ticketCardHeader">
                  <div className="ticketUserMeta">
                    <div className="ticketAvatar">{getInitials(t.name)}</div>
                    <div>
                      <h4>{t.name}</h4>
                      <p>{t.email}</p>
                    </div>
                  </div>

                  <div className="ticketBadges">
                    <span className="ticketCategoryTag">{t.category || "General"}</span>
                    <span className={`ticketStatusPill ${t.status.toLowerCase()}`}>
                      {t.status === "IN_PROGRESS" ? "In Progress" : t.status}
                    </span>
                  </div>
                </div>

                <h3 className="ticketSubject">{t.subject}</h3>
                <div className="ticketBody">{t.message}</div>

                <div className="ticketFooter">
                  <span>
                    Submitted on {new Date(t.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>

                  <div className="ticketActions">
                    {t.status !== "IN_PROGRESS" && t.status !== "RESOLVED" && (
                      <button
                        className="outlineAction compact"
                        disabled={updatingId === t.id}
                        onClick={() => handleStatusChange(t.id, "IN_PROGRESS")}
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                      >
                        In Progress
                      </button>
                    )}

                    {t.status !== "RESOLVED" ? (
                      <button
                        className="learnerPrimary compact"
                        disabled={updatingId === t.id}
                        onClick={() => handleStatusChange(t.id, "RESOLVED")}
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                      >
                        ✓ Mark Resolved
                      </button>
                    ) : (
                      <button
                        className="outlineAction compact"
                        disabled={updatingId === t.id}
                        onClick={() => handleStatusChange(t.id, "OPEN")}
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                      >
                        Re-open Ticket
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
