"use client";

import { useEffect, useState } from "react";

type Role = "learner" | "specialist" | "admin";

export default function RoleGuard({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("learnova_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      const userRole = user.role?.toString().toUpperCase();
      const requiredRole = role.toUpperCase();

      if (userRole === requiredRole) {
        setAllowed(true);
        setChecking(false);
        return;
      }

      setChecking(false);

      if (userRole === "ADMIN") {
        window.location.href = "/admin";
      } else if (userRole === "SPECIALIST") {
        window.location.href = "/specialist";
      } else if (userRole === "LEARNER") {
        window.location.href = "/learner";
      } else {
        localStorage.removeItem("learnova_user");
        localStorage.removeItem("learnova_token");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Invalid stored user:", error);

      localStorage.removeItem("learnova_user");
      localStorage.removeItem("learnova_token");

      window.location.href = "/login";
    }
  }, [role]);

  if (checking || !allowed) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg, #ffffff)",
        }}
      >
        <p>Loading...</p>
      </main>
    );
  }

  return <>{children}</>;
}
