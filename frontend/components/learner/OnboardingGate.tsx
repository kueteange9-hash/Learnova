"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (path === "/learner/onboarding") return;
    let active = true;
    setError("");
    api.getLearnerPreferences().then(({ profile }) => {
      if (!active) return;
      setChecked(path);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [path, router, attempt]);
  if (path === "/learner/onboarding" || checked === path) return <>{children}</>;
  return <div style={{ padding: 40 }} aria-live="polite">{error ? <><p role="alert">{error}</p><button onClick={() => setAttempt(n => n + 1)}>Try again</button></> : <p>Loading your learning space...</p>}</div>;
}
