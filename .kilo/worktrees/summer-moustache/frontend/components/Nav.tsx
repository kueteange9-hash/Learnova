"use client";

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

  // Don't render role-dependent navigation until
  // the current user has been loaded.
  if (!loaded) {
    return (
      <header className="nav">
        <Link className="brand" href="/">
          <span className="brandMark">L</span>
          Learnova
        </Link>
      </header>
    );
  }

  return (
    <header className="nav">
      {/* Learnova Logo */}
      <Link className="brand" href="/">
        <span className="brandMark">L</span>
        Learnova
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

        {/* Appointments */}
        <Link href="/appointments" onClick={() => setMenuOpen(false)}>
          Appointments
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
              <img src={user.photo} alt={user.name} />
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