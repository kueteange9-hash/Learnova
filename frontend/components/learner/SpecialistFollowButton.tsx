"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import Icon from "./Icon";
import "./specialist-follow.css";

export default function SpecialistFollowButton({ specialistId, name, onFollowingChange }: { specialistId: string; name: string; onFollowingChange?: (following: boolean) => void }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const locked = useRef(false);

  useEffect(() => {
    let active = true;
    setFollowing(null);
    setError("");
    api.getFollowing()
      .then(result => { if (active) setFollowing(result.specialistIds.includes(specialistId)); })
      .catch(() => { if (active) setError("Couldn't load your follow status."); });
    return () => { active = false; };
  }, [specialistId, attempt]);

  async function toggleFollow() {
    if (following === null || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.setSpecialistFollow(specialistId, !following);
      setFollowing(result.following);
      onFollowingChange?.(result.following);
      setMessage(result.following ? `You are now following ${name}.` : `You unfollowed ${name}.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't update your follow. Please try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return <div className="specialistFollow">
    <button
      type="button"
      className={`specialistFollowButton${following ? " isFollowing" : ""}`}
      disabled={busy || following === null}
      aria-pressed={following === true}
      aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
      onClick={toggleFollow}
    >
      <Icon name={following ? "check" : "user"} size={17}/>
      {busy ? "Saving..." : following === null ? "Loading..." : following ? "Subscribed" : "Subscribe"}
    </button>
    {following && <p className="specialistFollowHint">Select Following to unfollow.</p>}
    <span className="specialistFollowAnnouncement" role="status">{message}</span>
    {error && <div className="specialistFollowError" role="alert">
      <p>{error}</p>
      {following === null && <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button>}
    </div>}
  </div>;
}
