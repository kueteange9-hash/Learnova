"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api } from "@/lib/api";

type AdminAppointment = {
  id: string;
  date: string;
  format: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  notes: string | null;
  meetingUrl: string | null;
  learner: {
    id: string;
    name: string;
    email: string;
  };
  specialist: {
    id: string;
    name: string;
    email: string;
  };
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadAppointments() {
    try {
      const res = await api.getAdminAppointments();
      setAppointments(res.appointments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id);
    setError("");
    setNotice("");
    try {
      await api.updateAdminAppointment(id, { status: newStatus });
      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, status: newStatus as any } : a))
      );
      setNotice(`Appointment status updated to ${newStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = appointments.filter(a => {
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    const matchQuery =
      a.learner.name.toLowerCase().includes(query.toLowerCase()) ||
      a.learner.email.toLowerCase().includes(query.toLowerCase()) ||
      a.specialist.name.toLowerCase().includes(query.toLowerCase()) ||
      a.specialist.email.toLowerCase().includes(query.toLowerCase());
    return matchStatus && matchQuery;
  });

  return (
    <div className="learnerPage adminAppointmentsPage">
      <section className="dashboardHello">
        <div>
          <p className="pageKicker">BOOKINGS & SESSIONS</p>
          <h1>Appointments</h1>
          <p>Monitor and manage guidance sessions scheduled between learners and specialists.</p>
        </div>
      </section>

      {notice && <div className="formAlert success"><Icon name="check" size={16} />{notice}</div>}
      {error && <div className="formAlert error">{error}</div>}

      <div className="directoryTools">
        <div className="directorySearch">
          <Icon name="search" size={18} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by learner or specialist name..."
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">All session statuses</option>
          <option value="PENDING">Pending confirmation</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="resultsHeading">
        <p><b>{filtered.length}</b> appointments shown ({appointments.length} total)</p>
      </div>

      {loading ? (
        <div className="apiState">Loading appointments...</div>
      ) : filtered.length ? (
        <div className="adminTableWrap panel">
          <table className="adminDataTable">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Specialist</th>
                <th>Date & Time</th>
                <th>Format</th>
                <th>Status</th>
                <th>Change Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.learner.name}</strong>
                    <small className="mutedBlock">{a.learner.email}</small>
                  </td>
                  <td>
                    <strong>{a.specialist.name}</strong>
                    <small className="mutedBlock">{a.specialist.email}</small>
                  </td>
                  <td>
                    <span>{new Date(a.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                    <small className="mutedBlock">{new Date(a.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
                  </td>
                  <td>
                    <span className="formatBadge">{a.format}</span>
                  </td>
                  <td>
                    <span className={`appointmentStatus ${a.status.toLowerCase()}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="tableSelect"
                      disabled={updatingId === a.id}
                      value={a.status}
                      onChange={e => handleStatusChange(a.id, e.target.value)}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="emptyState panel">
          <Icon name="calendar" size={32} />
          <h3>No appointments found</h3>
          <p>No appointments match the current filters.</p>
        </div>
      )}
    </div>
  );
}
