"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api } from "@/lib/api";

type PaymentRecord = {
  id: string;
  amount: number;
  status: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type WorkshopRegRecord = {
  id: string;
  paymentMethod: string | null;
  paymentStatus: string;
  status: string;
  createdAt: string;
  learner: {
    id: string;
    name: string;
    email: string;
  };
  workshop: {
    id: string;
    title: string;
    price: number | null;
    type: string;
  };
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [registrations, setRegistrations] = useState<WorkshopRegRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"registrations" | "direct">("registrations");

  async function loadPayments() {
    try {
      const res = await api.getAdminPayments();
      setPayments(res.payments);
      setRegistrations(res.registrations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const totalWorkshopRevenue = registrations
    .filter(r => r.paymentStatus === "COMPLETED" && r.workshop.price)
    .reduce((sum, r) => sum + (r.workshop.price || 0), 0);

  const completedRegs = registrations.filter(r => r.paymentStatus === "COMPLETED").length;

  return (
    <div className="learnerPage adminPaymentsPage">
      <section className="dashboardHello">
        <div>
          <p className="pageKicker">FINANCIAL ACTIVITY</p>
          <h1>Payments & Transactions</h1>
          <p>Review admissions, payment methods, and workshop transactions across the platform.</p>
        </div>
      </section>

      {error && <div className="formAlert error">{error}</div>}

      <section className="adminMetricGrid">
        <article>
          <span className="statIcon green"><Icon name="check" /></span>
          <div>
            <strong>{totalWorkshopRevenue.toLocaleString()} FCFA</strong>
            <p>Completed revenue</p>
          </div>
        </article>
        <article>
          <span className="statIcon blue"><Icon name="sparkles" /></span>
          <div>
            <strong>{completedRegs}</strong>
            <p>Paid registrations</p>
          </div>
        </article>
        <article>
          <span className="statIcon purple"><Icon name="users" /></span>
          <div>
            <strong>{registrations.length}</strong>
            <p>Total admissions</p>
          </div>
        </article>
      </section>

      <div className="ws-tabs" style={{ marginBottom: "1.5rem" }}>
        <button
          className={tab === "registrations" ? "active" : ""}
          onClick={() => setTab("registrations")}
        >
          Workshop Registrations ({registrations.length})
        </button>
        <button
          className={tab === "direct" ? "active" : ""}
          onClick={() => setTab("direct")}
        >
          Direct Transactions ({payments.length})
        </button>
      </div>

      {loading ? (
        <div className="apiState">Loading payments...</div>
      ) : tab === "registrations" ? (
        registrations.length ? (
          <div className="adminTableWrap panel">
            <table className="adminDataTable">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Workshop</th>
                  <th>Admission Type</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(r => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.learner.name}</strong>
                      <small className="mutedBlock">{r.learner.email}</small>
                    </td>
                    <td>
                      <strong>{r.workshop.title}</strong>
                    </td>
                    <td>
                      <span className={`wsBadge ${r.workshop.type.toLowerCase()}`}>
                        {r.workshop.type}
                      </span>
                    </td>
                    <td>
                      <strong>{r.workshop.type === "FREE" ? "Free" : `${r.workshop.price?.toLocaleString()} FCFA`}</strong>
                    </td>
                    <td>
                      <span className="mutedText">{r.paymentMethod || "Direct / Free"}</span>
                    </td>
                    <td>
                      <span className={`appointmentStatus ${r.paymentStatus.toLowerCase()}`}>
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span>{new Date(r.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="emptyState panel">
            <Icon name="check" size={32} />
            <h3>No registrations recorded yet</h3>
            <p>When learners register for workshops, their transaction details appear here.</p>
          </div>
        )
      ) : payments.length ? (
        <div className="adminTableWrap panel">
          <table className="adminDataTable">
            <thead>
              <tr>
                <th>User</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.user.name}</strong>
                    <small className="mutedBlock">{p.user.email}</small>
                  </td>
                  <td>{p.description || "General platform service"}</td>
                  <td><strong>{p.amount.toLocaleString()} FCFA</strong></td>
                  <td><small className="mutedText">{p.reference || "N/A"}</small></td>
                  <td>
                    <span className={`appointmentStatus ${p.status.toLowerCase()}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{new Date(p.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="emptyState panel">
          <Icon name="check" size={32} />
          <h3>No direct payments recorded yet</h3>
          <p>Direct session payments and invoices will appear here.</p>
        </div>
      )}
    </div>
  );
}
