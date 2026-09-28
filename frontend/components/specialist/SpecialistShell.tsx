"use client";

import { assetUrl } from "@/lib/assets";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import Icon from "@/components/learner/Icon";
import { api } from "@/lib/api";
import { updateCurrentProfile, currentUser, logout, User } from "@/lib/store";

const items = [
  { href: "/specialist", label: "Overview", icon: "home" },
  { href: "/specialist/appointments", label: "Appointments", icon: "calendar" },
  { href: "/specialist/availability", label: "Availability", icon: "clock" },
  { href: "/specialist/profile", label: "Professional profile", icon: "user" },
  { href: "/specialist/community", label: "Community hub", icon: "community" },
  { href: "/specialist/workshops", label: "Workshops", icon: "sparkles" },
  { href: "/specialist/notifications", label: "Notifications", icon: "bell" },
  { href: "/specialist/messages", label: "Messages", icon: "message" },
  { href: "/support", label: "Help & Support", icon: "message" },
];

export default function SpecialistShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setUser(currentUser());
    refresh();
    window.addEventListener("learnova:profile-updated", refresh);
    window.addEventListener("storage", refresh);
    let active = true;
    api
      .getMySpecialistProfile()
      .then(({ specialist }) => {
        if (active) updateCurrentProfile(specialist.user);
      })
      .catch(() => {});
    return () => {
      active = false;
      window.removeEventListener("learnova:profile-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => setOpen(false), [path]);

  return (
    <RoleGuard role="specialist">
      <div className="learnerApp specialistApp">
        <aside className={`learnerSidebar ${open ? "isOpen" : ""}`}>
          <div className="sidebarBrand" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.png" alt="Learnova Logo" style={{ height: "54px", width: "auto", objectFit: "contain", background: "#ffffff", borderRadius: "8px", padding: "4px 8px" }} />
            <div>
              <small>SPECIALIST SPACE</small>
            </div>
          </div>
          <nav className="sidebarNav">
            <span className="navLabel">PRACTICE</span>
            {items.map((item) => {
              const active = item.href === "/specialist" ? path === item.href : path.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                  <Icon name={item.icon} size={19} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button className="sidebarLogout" onClick={logout}>
            <Icon name="logout" size={18} />
            Log out
          </button>
        </aside>
        {open && <button className="sidebarBackdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
        <div className="learnerMain">
          <header className="learnerTopbar">
            <button className="sidebarToggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
              <Icon name={open ? "close" : "menu"} />
            </button>
            <p className="workspaceLabel">SPECIALIST WORKSPACE</p>
            <div className="topbarActions">
              <Link href="/specialist/notifications" className="iconButton" aria-label="Notifications">
                <Icon name="bell" />
                <span />
              </Link>
              <Link href="/specialist/profile" className="userPill">
                <div className="userAvatar">{user?.photo ? <img src={assetUrl(user.photo)} alt="" /> : user?.name?.[0] || "S"}</div>
                <div>
                  <b>{user?.name || "Specialist"}</b>
                  <small>Specialist</small>
                </div>
                <Icon name="chevron" size={15} />
              </Link>
            </div>
          </header>
          <main className="learnerContent">{children}</main>
        </div>
        <Link
          href="/specialist/ai"
          className={`aiAssistantFloat ${path === "/specialist/ai" ? "active" : ""}`}
          aria-label="Open AI Assistant"
          title="AI Assistant"
        >
          <Icon name="sparkles" size={23} />
        </Link>
      </div>
    </RoleGuard>
  );
}
