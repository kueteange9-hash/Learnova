"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import { getUsers } from "@/lib/store";

function SpecialistsContent() {
  const q = useSearchParams();
  const selected = q.get("specialist");
  const [domain, setDomain] = useState("All");
  const specialists = getUsers().filter(
    (u) => u.role === "specialist" && (domain === "All" || u.domain === domain)
  );

  if (selected) {
    const s = getUsers().find((u) => u.id === selected);
    if (s) return <Profile specialist={s} />;
  }

  return (
    <>
      <Nav />
      <main className="dashboard">
        <div className="welcome">
          <div>
            <span className="eyebrow">Specialists</span>
            <h1>Find the right expert</h1>
            <p>Our AI-assisted recommendations help you discover a suitable human specialist.</p>
          </div>
        </div>

        <div className="filterBar">
          <select value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option>All</option>
            <option>Career Guidance</option>
            <option>Entrepreneurship</option>
            <option>Academic Guidance</option>
          </select>
          <input placeholder="Search specialist..." />
        </div>

        <div className="specialistGrid">
          {specialists.map((s) => (
            <Card key={s.id}>
              <div className="profileRow">
                <div className="bigAvatar">
                  {s.photo ? <img src={s.photo} alt={s.name} /> : s.name[0]}
                </div>
                <div>
                  <b>{s.name}</b>
                  <small>{s.domain}</small>
                  {s.verified && <span className="verified">✓ Verified</span>}
                </div>
              </div>
              <p>{s.bio}</p>
              <div className="rating">
                ★★★★★ <span>4.9</span>
              </div>
              <Link
                className="primaryButton full"
                href={`/learner/specialists?specialist=${s.id}`}
              >
                View profile
              </Link>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}

function Profile({ specialist }: any) {
  return (
    <>
      <Nav />
      <main className="dashboard profilePage">
        <Link href="/learner/specialists" className="backLink">
          ← Back to specialists
        </Link>
        <Card className="profileHero">
          <div className="profilePhoto">
            {specialist.photo ? (
              <img src={specialist.photo} alt={specialist.name} />
            ) : (
              specialist.name[0]
            )}
          </div>
          <div className="profileInfo">
            <span className="verified">✓ Verified specialist</span>
            <h1>{specialist.name}</h1>
            <h3>{specialist.domain}</h3>
            <p>{specialist.bio}</p>
            <div className="rating">★★★★★ 4.9 · 128 reviews</div>
            <div className="profileActions">
              <Link
                className="primaryButton"
                href={`/appointments?specialist=${specialist.id}`}
              >
                Book Appointment →
              </Link>
              <button className="secondaryButton">💬 Message</button>
            </div>
          </div>
        </Card>
        <div className="twoCol">
          <Card>
            <h2>About</h2>
            <p>
              Professional guidance tailored to your goals. Sessions are private and can be held by video or chat.
            </p>
          </Card>
          <Card>
            <h2>Services</h2>
            <ul className="cleanList">
              <li>One-on-one counselling</li>
              <li>Career planning</li>
              <li>Goal setting</li>
              <li>Online consultations</li>
            </ul>
          </Card>
        </div>
      </main>
    </>
  );
}

export default function Specialists() {
  return (
    <Suspense fallback={<div className="loadingContainer">Loading specialists...</div>}>
      <SpecialistsContent />
    </Suspense>
  );
}
