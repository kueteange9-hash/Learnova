"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppointmentManager from "@/components/AppointmentManager";
import { api, AppointmentRecord, SpecialistProfile } from "@/lib/api";

export default function SpecialistAppointmentsPage() {
  const [items, setItems] = useState<AppointmentRecord[]>([]);
  const [profile, setProfile] = useState<SpecialistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  function load() {
    setLoading(true); setError("");
    Promise.all([api.getAppointments(), api.getMySpecialistProfile()]).then(([appointments, specialist]) => {
      setItems(appointments.appointments);
      setProfile(specialist.specialist);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);
  const verified = profile?.verification === "VERIFIED";
  return <div className="learnerPage"><section className="pageTitle"><div><p className="pageKicker">LEARNER SESSIONS</p><h1>Appointments</h1><p>Review requests, prepare meetings and manage your session history.</p></div>{verified ? <Link className="learnerPrimary" href="/specialist/availability">Manage availability</Link> : <button className="learnerPrimary" disabled title="Requires administrator verification">Verification required</button>}</section>
    {!verified && profile && <div className="formAlert error">You can review your appointment history here. Confirming sessions and editing meeting details unlock after an administrator verifies your credential.</div>}
    {error && <div role="alert" className="formAlert error">{error}<button className="outlineAction" onClick={load}>Try again</button></div>}
    {loading ? <div className="apiState">Loading appointments...</div> : !error && <AppointmentManager specialist verification={profile?.verification} items={items} onChange={updated => setItems(current => current.map(a => a.id === updated.id ? updated : a))}/>}
  </div>;
}
