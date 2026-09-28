"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api, AvailabilitySlot } from "@/lib/api";

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [verification, setVerification] = useState<string>("VERIFIED");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:45");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMySpecialistProfile()
      .then(x => {
        setSlots(x.specialist.availability);
        setVerification(x.specialist.verification);
      })
      .catch(e => setError(e.message));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (verification !== "VERIFIED") return;
    setSaving(true);
    setError("");
    try {
      const result = await api.addAvailability(
        new Date(`${date}T${start}`).toISOString(),
        new Date(`${date}T${end}`).toISOString()
      );
      setSlots([...slots, result.slot].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)));
      setDate("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this time");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.removeAvailability(id);
      setSlots(slots.filter(x => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove this time");
    }
  }

  const isVerified = verification === "VERIFIED";

  const groups = slots.reduce<Record<string, AvailabilitySlot[]>>((all, slot) => {
    const key = new Date(slot.startsAt).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    (all[key] ??= []).push(slot);
    return all;
  }, {});

  return (
    <div className="learnerPage">
      <section className="pageTitle">
        <div>
          <p className="pageKicker">SCHEDULING</p>
          <h1>Availability</h1>
          <p>Publish only the times you can reliably offer to learners.</p>
        </div>
      </section>

      {!isVerified && (
        <div
          className="formAlert error"
          style={{ background: "#fffbeb", borderColor: "#f59e0b", color: "#92400e", marginBottom: "1.25rem" }}
        >
          <Icon name="clock" size={18} />
          <span>
            Your specialist account is currently in <strong>{verification.toLowerCase()}</strong> status. Publishing availability slots is locked until the administrator verifies your credentials.
          </span>
        </div>
      )}

      {error && <div className="formAlert error">{error}</div>}

      <div className="availabilityLayout">
        <form className="panel availabilityForm" onSubmit={add}>
          <div className="editorSectionTitle">
            <span><Icon name="calendar" size={16} /></span>
            <div>
              <h2>Add an open time</h2>
              <p>Learners can request any published slot.</p>
            </div>
          </div>
          <fieldset disabled={!isVerified || saving} style={{ border: "none", padding: 0, margin: 0 }}>
            <label>
              Date
              <input
                required
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>
            <div className="formTwo">
              <label>
                Starts
                <input
                  type="time"
                  required
                  value={start}
                  onChange={e => setStart(e.target.value)}
                />
              </label>
              <label>
                Ends
                <input
                  type="time"
                  required
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                />
              </label>
            </div>
            <button className="learnerPrimary" disabled={saving || !isVerified}>
              {!isVerified ? "Verification required" : saving ? "Publishing..." : "Publish availability"}
            </button>
          </fieldset>
        </form>

        <section className="panel slotSchedule">
          <div className="panelHeading">
            <div>UPCOMING OPEN TIMES</div>
            <b>{slots.filter(x => !x.booked).length} open</b>
          </div>
          {Object.keys(groups).length ? (
            Object.entries(groups).map(([day, items]) => (
              <div className="slotDay" key={day}>
                <h3>{day}</h3>
                {items.map(slot => (
                  <div className={slot.booked ? "booked" : ""} key={slot.id}>
                    <Icon name="clock" size={15} />
                    <span>
                      {new Date(slot.startsAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(slot.endsAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <em>{slot.booked ? "Booked" : "Available"}</em>
                    {!slot.booked && (
                      <button type="button" onClick={() => remove(slot.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="emptyState">
              <Icon name="clock" size={28} />
              <h3>No availability published</h3>
              <p>Add your first open time to start accepting bookings.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
