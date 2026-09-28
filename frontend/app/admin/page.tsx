"use client";

import { assetUrl } from "@/lib/assets";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api, SpecialistProfile } from "@/lib/api";

export default function AdminOverview() {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [applications, setApplications] = useState<SpecialistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAdminOverview()
      .then(x => {
        setMetrics(x.metrics);
        setApplications(x.recentApplications);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="apiState">Loading administration data...</div>;

  return (
    <div className="learnerPage adminOverviewPage">
      <section className="dashboardHello">
        <div>
          <p className="pageKicker">PLATFORM OVERVIEW</p>
          <h1>Administration Dashboard</h1>
          <p>Supervise specialists, users, guidance domains, community posts, workshops, and bookings.</p>
        </div>
        <div className="dashboardActions" style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/admin/specialists" className="learnerPrimary">
            <Icon name="users" size={17} /> Verification queue
          </Link>
          <Link href="/admin/domains" className="outlineAction">
            <Icon name="sparkles" size={17} /> Manage domains
          </Link>
        </div>
      </section>

      {error && <div className="formAlert error">{error}</div>}

      <section className="adminMetricGrid">
        <Link href="/admin/users" className="metricCardLink">
          <article>
            <span className="statIcon purple"><Icon name="users" /></span>
            <div>
              <strong>{metrics.users || 0}</strong>
              <p>Total users</p>
            </div>
          </article>
        </Link>
        <Link href="/admin/specialists" className="metricCardLink">
          <article>
            <span className="statIcon green"><Icon name="briefcase" /></span>
            <div>
              <strong>{metrics.specialists || 0}</strong>
              <p>Specialists</p>
            </div>
          </article>
        </Link>
        <Link href="/admin/specialists?status=PENDING" className="metricCardLink">
          <article className={metrics.pendingSpecialists ? "needsAttention" : ""}>
            <span className="statIcon orange"><Icon name="clock" /></span>
            <div>
              <strong>{metrics.pendingSpecialists || 0}</strong>
              <p>Pending reviews</p>
            </div>
          </article>
        </Link>
        <Link href="/admin/domains" className="metricCardLink">
          <article>
            <span className="statIcon blue"><Icon name="sparkles" /></span>
            <div>
              <strong>{metrics.domains || 0}</strong>
              <p>Guidance domains</p>
            </div>
          </article>
        </Link>
      </section>

      <section className="adminMetricGrid" style={{ marginTop: "1rem" }}>
        <Link href="/admin/posts" className="metricCardLink">
          <article>
            <span className="statIcon purple"><Icon name="community" /></span>
            <div>
              <strong>{metrics.posts || 0}</strong>
              <p>Community posts</p>
            </div>
          </article>
        </Link>
        <Link href="/admin/workshops" className="metricCardLink">
          <article>
            <span className="statIcon blue"><Icon name="video" /></span>
            <div>
              <strong>{metrics.workshops || 0}</strong>
              <p>Workshops</p>
            </div>
          </article>
        </Link>
        <Link href="/admin/appointments" className="metricCardLink">
          <article>
            <span className="statIcon green"><Icon name="calendar" /></span>
            <div>
              <strong>{metrics.appointments || 0}</strong>
              <p>Appointments</p>
            </div>
          </article>
        </Link>
        <Link href="/admin/payments" className="metricCardLink">
          <article>
            <span className="statIcon orange"><Icon name="check" /></span>
            <div>
              <strong>{metrics.payments || 0}</strong>
              <p>Transactions</p>
            </div>
          </article>
        </Link>
      </section>

      <div className="adminOverviewGrid" style={{ marginTop: "1.5rem" }}>
        <section className="panel adminQueue">
          <div className="panelHeading">
            <div>SPECIALIST VERIFICATION QUEUE</div>
            <Link href="/admin/specialists">Open review queue <Icon name="arrow" size={14} /></Link>
          </div>
          {applications.length ? (
            applications.map(p => (
              <article key={p.id}>
                <div className="avatar avatar-blue">
                  {p.user.image ? (
                    <img src={assetUrl(p.user.image)} alt="" />
                  ) : (
                    p.user.name.split(" ").map(x => x[0]).join("").slice(0, 2)
                  )}
                </div>
                <div>
                  <h3>{p.user.name}</h3>
                  <p>{p.domain} · Applied {new Date(p.user.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
                <span className={p.verificationDocument ? "documentReady" : "documentMissing"}>
                  {p.verificationDocument ? "Document ready" : "No document"}
                </span>
                <Link href={`/admin/specialists?review=${p.id}`} className="outlineAction">Review</Link>
              </article>
            ))
          ) : (
            <div className="emptyCompact">
              <Icon name="check" />
              <div>
                <b>No pending applications</b>
                <p>New specialist registrations will appear here for verification review.</p>
              </div>
            </div>
          )}
        </section>

        <aside className="panel adminActivity">
          <div className="panelHeading">
            <div>MANAGEMENT SHORTCUTS</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem 0" }}>
            <Link href="/admin/domains" className="outlineAction" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon name="sparkles" size={16} /> Manage 12+ guidance domains
            </Link>
            <Link href="/admin/posts" className="outlineAction" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon name="community" size={16} /> Moderate community posts
            </Link>
            <Link href="/admin/workshops" className="outlineAction" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon name="video" size={16} /> Supervise workshops
            </Link>
            <Link href="/admin/appointments" className="outlineAction" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon name="calendar" size={16} /> Manage 1-to-1 appointments
            </Link>
            <Link href="/admin/payments" className="outlineAction" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon name="check" size={16} /> Review payments & admissions
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
