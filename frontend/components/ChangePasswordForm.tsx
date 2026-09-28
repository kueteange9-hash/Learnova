"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/learner/Icon";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setError("New password must be no more than 72 bytes.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const result = await api.changePassword(currentPassword, newPassword);
      setSuccess(result.message || "Your password has been changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel profileEditorSection">
      <div className="editorSectionTitle">
        <span><Icon name="settings" size={17} /></span>
        <div><h2>Change password</h2><p>Enter your current password and choose a new one.</p></div>
      </div>
      {error && <div className="formAlert error" role="alert">{error}</div>}
      {success && <div className="formAlert success" role="status"><Icon name="check" size={16} />{success}</div>}
      <form onSubmit={submit} style={{ display: "grid", gap: "14px" }}>
        <label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
        <div className="formTwo">
          <label>New password<input type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
        </div>
        <div><button className="learnerPrimary" type="submit" disabled={busy}>{busy ? "Updating password..." : "Update password"}</button></div>
      </form>
    </section>
  );
}
