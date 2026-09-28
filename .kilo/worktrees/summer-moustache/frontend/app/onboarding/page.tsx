"use client";

/**
 * Learner onboarding.
 *
 * The answers were previously stored only in localStorage. They are now
 * ALSO sent to POST /api/onboarding (when the learner has a Learnova
 * account) so the AI guidance chat can personalise its answers from the
 * database. Only non-sensitive information is collected.
 */

import { useState } from "react";

import { api, getToken } from "@/lib/api";
import { saveOnboardingLocal } from "@/lib/store";

const DOMAINS = [
  "Academic Guidance",
  "Career Guidance",
  "Mental Wellbeing",
  "Agriculture",
  "Entrepreneurship",
  "Personal Development",
];

const EDUCATION_LEVELS = [
  "Secondary / high school",
  "University / college",
  "Vocational training",
  "Already graduated",
  "Other",
];

export default function Onboarding() {
  const [domain, setDomain] = useState("Academic Guidance");
  const [otherDomains, setOtherDomains] = useState<string[]>([]);
  const [goal, setGoal] = useState("Choose a career");
  const [interests, setInterests] = useState("");
  const [guidance, setGuidance] = useState("");
  const [career, setCareer] = useState("");
  const [education, setEducation] = useState(EDUCATION_LEVELS[0]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  function toggleDomain(value: string) {
    setOtherDomains((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    );
  }

  async function finish() {
    setSaving(true);

    const domains = Array.from(new Set([domain, ...otherDomains])).filter(Boolean);

    const payload = {
      domain,
      domains,
      goal,
      interests: interests
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      guidance: guidance.trim(),
      career: career.trim(),
      education,
      completed: true,
    };

    // 1. Keep the existing local behaviour (works even without a backend session)
    saveOnboardingLocal(payload);

    // 2. Persist it for the AI assistant when the learner is signed in
    if (getToken()) {
      try {
        await api.saveOnboarding({
          domains,
          interests: payload.interests,
          goal,
          guidance: payload.guidance,
          career: payload.career,
          education,
        });

        setNote("Saved to your Learnova profile.");
      } catch (error) {
        console.warn("Onboarding could not be synced with the server:", error);

        setNote(
          "Saved on this device. Your Learnova profile will sync the next time you sign in."
        );
      }
    }

    setSaving(false);
    setDone(true);

    // Short confirmation, then the learner dashboard with the AI chat.
    window.setTimeout(() => {
      window.location.href = "/learner";
    }, 900);
  }

  return (
    <main className="authPage">
      <div className="authCard wide">
        <span className="eyebrow">Optional onboarding</span>
        <h1>Let Learnova understand you</h1>
        <p>
          These answers help the Learnova AI Assistant personalise its guidance. You can skip this
          step and complete it later.
        </p>

        {!done ? (
          <>
            <label>
              What area do you need guidance in?
              <select value={domain} onChange={(e) => setDomain(e.target.value)}>
                {DOMAINS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>

            <label>Other domains you are interested in (optional)</label>
            <div className="checkGrid">
              {DOMAINS.filter((value) => value !== domain).map((value) => (
                <label className="checkRow" key={value}>
                  <input
                    type="checkbox"
                    checked={otherDomains.includes(value)}
                    onChange={() => toggleDomain(value)}
                  />
                  {value}
                </label>
              ))}
            </div>

            <label>
              What is your main goal?
              <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option>Choose a career</option>
                <option>Improve my studies</option>
                <option>Start a business</option>
                <option>Develop myself</option>
                <option>Find a specialist</option>
              </select>
            </label>

            <label>
              Your interests (optional, separated by commas)
              <input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. agriculture, technology, arts"
              />
            </label>

            <label>
              Where exactly do you need guidance? (optional)
              <input
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder="e.g. choosing a university course, finding customers"
              />
            </label>

            <label>
              Career or academic interest (optional)
              <input
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                placeholder="e.g. agribusiness, software engineering, teaching"
              />
            </label>

            <label>
              Current education level (optional)
              <select value={education} onChange={(e) => setEducation(e.target.value)}>
                {EDUCATION_LEVELS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>

            <div className="formActions">
              <button
                className="secondaryButton"
                onClick={() => (window.location.href = "/learner")}
              >
                Skip for now
              </button>

              <button className="primaryButton" onClick={finish} disabled={saving}>
                {saving ? "Saving…" : "Continue →"}
              </button>
            </div>
          </>
        ) : (
          <div className="success">
            ✓ Your preferences have been saved. Opening your dashboard…
            {note && <small style={{ display: "block", marginTop: "6px" }}>{note}</small>}
          </div>
        )}
      </div>
    </main>
  );
}
