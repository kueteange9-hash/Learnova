"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api, DomainItem } from "@/lib/api";

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Create / Edit modal state
  const [editingDomain, setEditingDomain] = useState<DomainItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "sparkles" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadDomains() {
    try {
      const res = await api.getAdminDomains();
      setDomains(res.domains);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load domains");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDomains();
  }, []);

  function startCreate() {
    setEditingDomain(null);
    setFormData({ name: "", description: "", icon: "sparkles" });
    setIsCreating(true);
    setError("");
    setNotice("");
  }

  function startEdit(domain: DomainItem) {
    setIsCreating(false);
    setEditingDomain(domain);
    setFormData({
      name: domain.name,
      description: domain.description || "",
      icon: domain.icon || "sparkles",
    });
    setError("");
    setNotice("");
  }

  function closeModal() {
    setIsCreating(false);
    setEditingDomain(null);
    setSaving(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Domain name is required.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingDomain) {
        const res = await api.updateAdminDomain(editingDomain.id, formData);
        setDomains(prev => prev.map(d => d.id === editingDomain.id ? res.domain : d));
        setNotice(`Domain "${res.domain.name}" updated successfully.`);
      } else {
        const res = await api.createAdminDomain(formData);
        setDomains(prev => [...prev, res.domain].sort((a, b) => a.name.localeCompare(b.name)));
        setNotice(`Domain "${res.domain.name}" added to the platform.`);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save domain");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the domain "${name}"?`)) return;
    setDeletingId(id);
    setError("");
    setNotice("");
    try {
      await api.deleteAdminDomain(id);
      setDomains(prev => prev.filter(d => d.id !== id));
      setNotice(`Domain "${name}" was deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete domain");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = domains.filter(d =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="learnerPage adminDomainsPage">
      <section className="dashboardHello">
        <div>
          <p className="pageKicker">PLATFORM TAXONOMY</p>
          <h1>Guidance & Counselling Domains</h1>
          <p>Manage the guidance specializations available to learners and specialists across Learnova.</p>
        </div>
        <button className="learnerPrimary" onClick={startCreate}>
          <Icon name="sparkles" size={16} /> Add new domain
        </button>
      </section>

      {notice && <div className="formAlert success"><Icon name="check" size={16} />{notice}</div>}
      {error && <div className="formAlert error">{error}</div>}

      <div className="directoryTools">
        <div className="directorySearch">
          <Icon name="search" size={18} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search guidance domains..."
          />
        </div>
        <div className="resultsHeading">
          <p><b>{filtered.length}</b> guidance domains ({domains.length} total)</p>
        </div>
      </div>

      {/* Domain Editor Modal */}
      {(isCreating || editingDomain) && (
        <div className="adminModalBackdrop" onClick={closeModal}>
          <div className="adminModal panel" onClick={e => e.stopPropagation()}>
            <div className="panelHeading">
              <div>{editingDomain ? "EDIT DOMAIN" : "ADD GUIDANCE DOMAIN"}</div>
              <button type="button" className="closeBtn" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave} className="adminDomainForm">
              <label>
                Domain Name
                <input
                  required
                  type="text"
                  placeholder="e.g. Career Guidance & Planning"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </label>

              <label>
                Description / Scope
                <textarea
                  rows={3}
                  placeholder="Describe what guidance and counselling topics this domain covers..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </label>

              <label>
                Category Icon Tag
                <select
                  value={formData.icon}
                  onChange={e => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                >
                  <option value="briefcase">Briefcase (Career)</option>
                  <option value="book">Book (Academic / Studies)</option>
                  <option value="heart">Heart (Wellbeing / Mental Health)</option>
                  <option value="sparkles">Sparkles (Personal Growth)</option>
                  <option value="bulb">Lightbulb (Entrepreneurship / Innovation)</option>
                  <option value="leaf">Leaf (Agriculture / Agribusiness)</option>
                  <option value="cpu">CPU (Technology / Digital)</option>
                  <option value="wallet">Wallet (Finance / Money)</option>
                  <option value="users">Users (Family / Relationships)</option>
                  <option value="target">Target (Leadership / Executive)</option>
                  <option value="activity">Activity (Health / Wellness)</option>
                  <option value="award">Award (Youth / Mentorship)</option>
                </select>
              </label>

              <div className="modalActions">
                <button type="button" className="outlineAction" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="learnerPrimary" disabled={saving}>
                  {saving ? "Saving..." : editingDomain ? "Update domain" : "Create domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="apiState">Loading guidance domains...</div>
      ) : filtered.length ? (
        <div className="domainCardsGrid">
          {filtered.map(domain => (
            <article key={domain.id} className="panel domainCard">
              <div className="domainCardHead">
                <div className="domainIconBadge">
                  <Icon name="sparkles" size={18} />
                </div>
                <div>
                  <h3>{domain.name}</h3>
                  <span className="domainTag">Guidance Domain</span>
                </div>
              </div>
              <p className="domainDesc">{domain.description || "No description provided for this domain."}</p>
              <div className="domainCardActions">
                <button
                  type="button"
                  className="outlineAction compact"
                  onClick={() => startEdit(domain)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="outlineAction dangerAction compact"
                  disabled={deletingId === domain.id}
                  onClick={() => handleDelete(domain.id, domain.name)}
                >
                  {deletingId === domain.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="emptyState panel">
          <Icon name="sparkles" size={32} />
          <h3>No domains found</h3>
          <p>Try searching for a different keyword or create a new guidance domain.</p>
        </div>
      )}
    </div>
  );
}
