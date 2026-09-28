"use client";

import { useEffect } from "react";

export default function Onboarding() {
  useEffect(() => {
    window.location.replace("/learner/onboarding");
  }, []);

  return (
    <div className="apiState">
      Redirecting to onboarding...
    </div>
  );
}
