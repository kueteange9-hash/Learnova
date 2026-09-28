"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/store";

export default function Workshops() {
  const router = useRouter();
  useEffect(() => {
    const user = currentUser();
    router.replace(user?.role === "specialist" ? "/specialist/workshops" : user?.role === "learner" ? "/learner/workshops" : user?.role === "admin" ? "/admin" : "/login");
  }, [router]);
  return <main className="apiState" role="status">Opening workshops…</main>;
}
