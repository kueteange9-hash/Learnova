"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api } from "@/lib/api";

type AdminWorkshop = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  type: "FREE" | "PAID";
  price: number | null;
  date: string;
  meetingUrl: string | null;
  specialist: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  _count: {
    registrations: number;
  };
};

export default function AdminWorkshopsPage() {
  const [workshops, setWorkshops] = useState<AdminWorkshop[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadWorkshops() {
    try {
      const res = await api.getAdminWorkshops();
      setWorkshops(res.workshops);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workshops");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkshops();
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete the workshop "${title}"? This will cancel all learner registrations.`)) return;
    setDeletingId(id);
    setError("");
    setNotice("");
    try {
      await api.deleteAdminWorkshop(id);
      setWorkshops(prev => prev.filter(w => w.id !== id));
      setNotice(`Workshop "${title}" was removed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workshop");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = workshops.filter(w => {
    const matchType = typeFilter === "ALL" || w.type === typeFilter;
    const matchQuery =
      w.title.toLowerCase().includes(query.toLowerCase()) ||
      w.description.toLowerCase().includes(query.toLowerCase()) ||
      w.specialist.name.toLowerCase().includes(query.toLowerCase());
    return matchType && matchQuery;
  });

  return (
    <div className="learnerPage adminWorkshopsPage">
      <section className="dashboardHello">
        <div>
          <p className="pageKicker">EVENT MANAGEMENT</p>
          <h1>Workshops</h1>
          <p>Inspect and manage workshops created by specialists across the platform.</p>
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
            placeholder="Search workshops by title, description, or host..."
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="ALL">All admission types</option>
          <option value="FREE">Free registration</option>
          <option value="PAID">Paid registration</option>
        </select>
      </div>

      <div className="resultsHeading">
        <p><b>{filtered.length}</b> workshops shown ({workshops.length} total)</p>
      </div>

      {loading ? (
        <div className="apiState">Loading workshops...</div>
      ) : filtered.length ? (
        <div className="adminTableWrap panel">
          <table className="adminDataTable">
            <thead>
              <tr>
                <th>Workshop</th>
                <th>Host Specialist</th>
                <th>Date & Time</th>
                <th>Admission</th>
                <th>Registered</th>
                <th>Meeting Room</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id}>
                  <td>
                    <strong>{w.title}</strong>
                    <p className="tinyExcerpt">{w.description.slice(0, 70)}...</p>
                  </td>
                  <td>
                    <span>{w.specialist.name}</span>
                    <small className="mutedBlock">{w.specialist.email}</small>
                  </td>
                  <td>
                    <span>{new Date(w.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                    <small className="mutedBlock">{new Date(w.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
                  </td>
                  <td>
                    <span className={`wsBadge ${w.type.toLowerCase()}`}>
                      {w.type === "FREE" ? "Free" : `${w.price?.toLocaleString()} FCFA`}
                    </span>
                  </td>
                  <td>
                    <strong>{w._count?.registrations || 0}</strong> learners
                  </td>
                  <td>
                    {w.meetingUrl ? (
                      <a href={w.meetingUrl} target="_blank" rel="noreferrer" className="tableLink">
                        Open link ↗
                      </a>
                    ) : (
                      <span className="mutedText">Not set</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="outlineAction dangerAction compact"
                      disabled={deletingId === w.id}
                      onClick={() => handleDelete(w.id, w.title)}
                    >
                      {deletingId === w.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="emptyState panel">
          <Icon name="video" size={32} />
          <h3>No workshops found</h3>
          <p>No workshops match the current filters.</p>
        </div>
      )}
    </div>
  );
}
