"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import RoleGuard from "@/components/RoleGuard";
import AiChatBox from "@/components/ai/AiChatBox";
import {
  currentUser,
  getAppointments,
  getPosts,
  getWorkshops,
  User,
} from "@/lib/store";

export default function Learner() {
  const [u, setU] = useState<User | null>(null);

  useEffect(() => setU(currentUser()), []);

  if (!u) return null;

  const apps = getAppointments().filter((a) => a.learner === u.name);
  const posts = getPosts().slice(0, 2);
  const workshops = getWorkshops().filter((w) => w.status === "Approved");

  return (
    <RoleGuard role="learner">
      <Nav />
      <main className="dashboard">
        <div className="welcome">
          <div>
            <span className="eyebrow">AI-Assisted Guidance</span>
            <h1>Good day, {u.name.split(" ")[0]} 👋</h1>
            <p>
              Find the right guidance, specialist, or learning opportunity for your goals.
            </p>
          </div>
          <Link className="primaryButton" href="/learner/specialists">
            Find a Specialist →
          </Link>
        </div>

        <div className="metricGrid">
          <Metric n={apps.length} t="Appointments" />
          <Metric n={posts.length} t="New posts" />
          <Metric n={workshops.length} t="Workshops" />
          <Metric n="AI" t="Recommendations" />
        </div>

        {/* ==========================================================
            GENERAL AI GUIDANCE CHAT
            Appears after onboarding; personalised with the learner's
            onboarding information and the Learnova database.
        ========================================================== */}
        <AiChatBox user={u} />

        <div className="dashboardGrid">
          <section>
            <div className="sectionHead">
              <h2>Recommended for you</h2>
              <Link href="/learner/specialists">View all</Link>
            </div>

            <div className="specialistGrid">
              {[...getSpecialists()].slice(0, 3).map((s) => (
                <Card key={s.id}>
                  <div className="profileRow">
                    <div className="bigAvatar">{s.name[0]}</div>
                    <div>
                      <b>{s.name}</b>
                      <small>{s.domain}</small>
                      {s.verified && <span className="verified">✓ Verified</span>}
                    </div>
                  </div>
                  <p>{s.bio}</p>
                  <Link
                    className="secondaryButton full"
                    href={`/learner/specialists?specialist=${s.id}`}
                  >
                    View profile
                  </Link>
                </Card>
              ))}
            </div>
          </section>

          <aside>
            <Card>
              <div className="sectionHead">
                <h2>Upcoming appointments</h2>
                <Link href="/appointments">View</Link>
              </div>

              {apps.length ? (
                apps.map((a) => (
                  <div className="appointment" key={a.id}>
                    <b>{a.specialist}</b>
                    <span>
                      {a.date} · {a.time}
                    </span>
                    <em>{a.type}</em>
                  </div>
                ))
              ) : (
                <p className="muted">No appointments yet. Book from a specialist profile.</p>
              )}
            </Card>

            <Card>
              <div className="sectionHead">
                <h2>Quick actions</h2>
              </div>
              <div className="quickLinks">
                <a href="#ai-assistant">✦ AI Assistant</a>
                <Link href="/community">📝 Community</Link>
                <Link href="/workshops">🎓 Workshops</Link>
                <Link href="/notifications">🔔 Notifications</Link>
                <Link href="/settings">👤 My profile</Link>
              </div>
            </Card>
          </aside>
        </div>

        <section>
          <div className="sectionHead">
            <h2>Community</h2>
            <Link href="/community">See all</Link>
          </div>

          <div className="postGrid">
            {posts.map((p) => (
              <PostPreview key={p.id} p={p} />
            ))}
          </div>
        </section>
      </main>
    </RoleGuard>
  );
}

function Metric({ n, t }: { n: any; t: string }) {
  return (
    <Card>
      <strong className="metric">{n}</strong>
      <span>{t}</span>
    </Card>
  );
}

function PostPreview({ p }: any) {
  return (
    <Card>
      <div className="profileRow">
        <div className="avatar">{p.author[0]}</div>
        <div>
          <b>{p.author}</b>
          <small>{p.domain}</small>
        </div>
      </div>
      <p>{p.text}</p>
      <div className="postActions">
        ♥ {p.likes}　💬 {p.comments.length}　↗ {p.shares}
      </div>
    </Card>
  );
}

function getSpecialists() {
  return [
    {
      id: "u2",
      name: "Dr. Sarah Williams",
      domain: "Career Guidance",
      verified: true,
      bio: "Career and professional development specialist.",
    },
    {
      id: "u4",
      name: "Michael Brown",
      domain: "Entrepreneurship",
      verified: true,
      bio: "Entrepreneurship mentor and business consultant.",
    },
  ];
}
