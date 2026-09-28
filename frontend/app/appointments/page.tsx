"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import { currentUser, getAppointments, getUsers, saveAppointments } from "@/lib/store";

function AppointmentsContent() {
  const q = useSearchParams();
  const specialistId = q.get("specialist");
  const [user, setUser] = useState<any>(null);
  const [date, setDate] = useState("2026-08-20");
  const [time, setTime] = useState("14:00");
  const [type, setType] = useState<any>("Video");

  useEffect(() => {
    setUser(currentUser());
  }, []);

  const specialist = getUsers().find((u) => u.id === specialistId);

  function book() {
    if (!specialist || !user) return;
    const a = {
      id: "a" + Date.now(),
      learner: user.name,
      specialist: specialist.name,
      specialistId: specialist.id,
      date,
      time,
      type,
      status: "Pending" as const,
    };
    saveAppointments([...getAppointments(), a]);
    alert("Appointment request sent.");
    window.location.href = "/appointments";
  }

  const apps = user
    ? getAppointments().filter(
        (a) => a.learner === user.name || a.specialistId === user.id
      )
    : [];

  return (
    <>
      <Nav />
      <main className="dashboard">
        {specialist && user?.role === "learner" ? (
          <Card className="bookingCard">
            <span className="eyebrow">Appointment</span>
            <h1>Book with {specialist.name}</h1>
            <p>Appointments are made directly from the specialist profile.</p>
            <div className="formGrid">
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Time
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
              <label>
                Consultation type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option>Video</option>
                  <option>Chat</option>
                  <option>In-person</option>
                </select>
              </label>
            </div>
            <button className="primaryButton" onClick={book}>
              Request Appointment →
            </button>
          </Card>
        ) : null}

        <div className="sectionHead">
          <div>
            <h1>Appointments</h1>
            <span className="muted">
              {user?.role === "learner"
                ? "Your booked appointments"
                : "Appointments with learners"}
            </span>
          </div>
        </div>

        <div className="feed">
          {apps.length ? (
            apps.map((a) => (
              <Card key={a.id}>
                <div className="appointment large">
                  <div>
                    <b>
                      {user?.role === "learner" ? a.specialist : a.learner}
                    </b>
                    <span>
                      {a.date} · {a.time} · {a.type}
                    </span>
                  </div>
                  <em className={`status ${a.status === "Confirmed" ? "good" : "pending"}`}>
                    {a.status}
                  </em>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <p className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
                No appointments found.
              </p>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}

export default function Appointments() {
  return (
    <Suspense fallback={<div className="loadingContainer">Loading appointments...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
