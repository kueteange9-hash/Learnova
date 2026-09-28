"use client";

import { assetUrl } from "@/lib/assets";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { currentUser, logout, User } from "@/lib/store";
import Icon from "./Icon";
import OnboardingGate from "./OnboardingGate";

const navItems = [
  { href: "/learner", label: "Overview", icon: "home" },
  { href: "/learner/specialists", label: "Find specialists", icon: "users" },
  { href: "/learner/appointments", label: "My appointments", icon: "video" },
  { href: "/learner/community", label: "Community hub", icon: "community" },
  { href: "/learner/workshops", label: "Workshops", icon: "calendar" },
  { href: "/learner/notifications", label: "Notifications", icon: "bell" },
  { href: "/learner/messages", label: "Messages", icon: "message" },
  { href: "/support", label: "Help & Support", icon: "message" },
  { href: "/learner/profile", label: "My profile", icon: "user" },
];

export default function LearnerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => setUser(currentUser()), []);
  useEffect(() => setOpen(false), [path]);

  return (
    <RoleGuard role="learner">
      <OnboardingGate>
        {path === "/learner/onboarding" ? (
          children
        ) : (
          <div className="learnerApp">
            <aside className={`learnerSidebar ${open ? "isOpen" : ""}`}>
              <div className="sidebarBrand" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img src="/logo.png" alt="Learnova Logo" style={{ height: "54px", width: "auto", objectFit: "contain", background: "#ffffff", borderRadius: "8px", padding: "4px 8px" }} />
                <div>
                  <small>LEARNER SPACE</small>
                </div>
              </div>
              <nav className="sidebarNav" aria-label="Learner navigation">
                <span className="navLabel">MENU</span>
                {navItems.map((item) => {
                  const active = item.href === "/learner" ? path === item.href : path.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                      <Icon name={item.icon} size={19} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <button className="sidebarLogout" onClick={logout}>
                <Icon name="logout" size={18} /> Log out
              </button>
            </aside>
            {open && <button className="sidebarBackdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
            <div className="learnerMain">
              <header className="learnerTopbar">
                <button className="sidebarToggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
                  <Icon name={open ? "close" : "menu"} />
                </button>
                <div className="topSearch">
                  <Icon name="search" size={18} />
                  <input aria-label="Search Learnova" placeholder="Search specialists, workshops, topics..." />
                </div>
                <div className="topbarActions">
                  <Link href="/learner/notifications" className="iconButton" aria-label="Notifications">
                    <Icon name="bell" />
                    <span />
                  </Link>
                  <Link href="/learner/profile" className="userPill">
                    <div className="userAvatar">{user?.photo ? <img src={assetUrl(user.photo)} alt="" /> : user?.name?.[0] || "A"}</div>
                    <div>
                      <b>{user?.name || "Learner"}</b>
                      <small>Learner</small>
                    </div>
                    <Icon name="chevron" size={15} />
                  </Link>
                </div>
              </header>
              <main className="learnerContent">{children}</main>
            </div>
            <Link
              href="/learner/ai"
              className={`aiAssistantFloat ${path === "/learner/ai" ? "active" : ""}`}
              aria-label="Open AI Assistant"
              title="AI Assistant"
            >
              <Icon name="sparkles" size={23} />
            </Link>
          </div>
        )}
      </OnboardingGate>
    </RoleGuard>
  );
}
