"use client";

import { assetUrl } from "@/lib/assets";
import Link from "next/link";
import { currentUser, logout } from "@/lib/store";
import { useEffect, useState } from "react";

export default function Nav() {
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = currentUser();
    setUser(storedUser);
    setLoaded(true);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  if (!loaded) {
    return (
      <header className="nav">
        <Link className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/logo.png" alt="Learnova Logo" style={{ height: "62px", width: "auto", objectFit: "contain", borderRadius: "8px", background: "#ffffff", padding: "4px 8px" }} />
        </Link>
      </header>
    );
  }

  return (
    <header className="nav">
      {/* Learnova Logo */}
      <Link className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img src="/logo.png" alt="Learnova Logo" style={{ height: "62px", width: "auto", objectFit: "contain", borderRadius: "8px", background: "#ffffff", padding: "4px 8px" }} />
      </Link>

      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Navigation */}
      <nav className={menuOpen ? "active" : ""}>
        {/* Home always returns to the landing page */}
        <Link href="/" onClick={() => setMenuOpen(false)}>
          Home
        </Link>

        {/* Learner-only link */}
        {user?.role === "learner" && (
          <Link
            href="/learner/specialists"
            onClick={() => setMenuOpen(false)}
          >
            Specialists
          </Link>
        )}

        {/* Messages */}
        {user && (
          <Link href={user?.role === "specialist" ? "/specialist/messages" : "/learner/messages"} onClick={() => setMenuOpen(false)}>
            Messages
          </Link>
        )}

        {/* Appointments */}
        <Link href={user?.role === "specialist" ? "/specialist/appointments" : user?.role === "learner" ? "/learner/appointments" : "/login"} onClick={() => setMenuOpen(false)}>
          Appointments
        </Link>

        {/* Help & Support (Feedback) */}
        <Link href="/support" onClick={() => setMenuOpen(false)}>
          Help & Support
        </Link>

        {/* Notifications */}
        <Link href="/notifications" onClick={() => setMenuOpen(false)}>
          Notifications
        </Link>
      </nav>

      {/* Right Side */}
      <div className="navRight">
        {user && (
          <Link href="/settings" className="avatar" title={user.name}>
            {user.photo ? (
              <img src={assetUrl(user.photo)} alt={user.name} />
            ) : (
              user.name.charAt(0)
            )}
          </Link>
        )}

        <button className="ghostButton" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
