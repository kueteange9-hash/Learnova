"use client";

import { assetUrl } from "@/lib/assets";
import { useEffect, useState, FormEvent } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import Icon from "@/components/learner/Icon";
import { api } from "@/lib/api";
import { currentUser, getUsers, saveUsers } from "@/lib/store";

export default function Settings() {
  const [u, setU] = useState<any>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passBusy, setPassBusy] = useState(false);

  useEffect(() => {
    const x = currentUser();
    if (!x) return;
    setU(x);
    setName(x.name);
    setBio(x.bio || "");
  }, []);

  if (!u) {
    return (
      <>
        <Nav />
        <main className="dashboard narrow">
          <Card>
            <p className="muted">Please sign in to access settings.</p>
          </Card>
        </main>
      </>
    );
  }

  function saveProfile() {
    const users = getUsers().map((x) => (x.id === u.id ? { ...x, name, bio } : x));
    saveUsers(users);
    setU({ ...u, name, bio });
    alert("Profile saved successfully.");
  }

  function photo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const users = getUsers().map((x) => (x.id === u.id ? { ...x, photo: String(r.result) } : x));
      saveUsers(users);
      setU({ ...u, photo: String(r.result) });
    };
    r.readAsDataURL(f);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!currentPassword) {
      setPassError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPassError("New password must be at least 8 characters long.");
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setPassError("New password must be no more than 72 bytes.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }

    setPassBusy(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setPassSuccess(res.message || "Your password has been changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPassError(err.message || "Could not change password. Please check your current password.");
    } finally {
      setPassBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="dashboard narrow" style={{ maxWidth: "720px", margin: "40px auto" }}>
        <Card>
          <span className="eyebrow">My Account</span>
          <h1 style={{ marginTop: "8px", fontSize: "1.8rem" }}>Profile & Settings</h1>

          <section style={{ marginTop: "24px", marginBottom: "36px" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Profile Details</h2>
            <div className="photoEditor" style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div className="profilePhoto" style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#ede9ff", color: "#7c3aed", display: "grid", placeItems: "center", fontSize: "1.5rem", fontWeight: "bold", overflow: "hidden" }}>
                {u.photo ? <img src={assetUrl(u.photo)} alt={u.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : u.name[0]}
              </div>
              <label className="secondaryButton" style={{ cursor: "pointer" }}>
                Change photo
                <input type="file" accept="image/*" hidden onChange={photo} />
              </label>
            </div>

            <div style={{ display: "grid", gap: "14px" }}>
              <label style={{ display: "grid", gap: "6px", fontWeight: "600" }}>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px" }} />
              </label>

              <label style={{ display: "grid", gap: "6px", fontWeight: "600" }}>
                Email
                <input value={u.email} disabled style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "#f5f6fa", opacity: 0.8 }} />
              </label>

              <label style={{ display: "grid", gap: "6px", fontWeight: "600" }}>
                Role
                <input value={u.role} disabled style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "#f5f6fa", opacity: 0.8, textTransform: "capitalize" }} />
              </label>

              <label style={{ display: "grid", gap: "6px", fontWeight: "600" }}>
                Bio
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about yourself" rows={3} style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px", resize: "vertical" }} />
              </label>

              <div>
                <button className="primaryButton" onClick={saveProfile} style={{ marginTop: "8px" }}>
                  Save profile changes
                </button>
              </div>
            </div>
          </section>

          <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: "32px 0" }} />

          {/* SECURITY & PASSWORD SECTION */}
          <section>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "6px" }}>Security & Password</h2>
            <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "20px" }}>
              Update your account password to keep your profile secure.
            </p>

            {passError && (
              <div className="formAlert error" role="alert" style={{ marginBottom: "16px" }}>
                <Icon name="close" size={16} />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="formAlert success" role="alert" style={{ marginBottom: "16px" }}>
                <Icon name="check" size={16} />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: "grid", gap: "16px" }}>
              <label style={{ display: "grid", gap: "6px", fontWeight: "600" }}>
                Current Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontWeight: "600" }}>
                New Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 8 characters"
                  required
                  minLength={8}
                  style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontWeight: "600" }}>
                Confirm New Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                  style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                />
              </label>

              <div>
                <button type="submit" className="primaryButton" disabled={passBusy} style={{ marginTop: "8px" }}>
                  {passBusy ? "Updating password..." : "Update password"}
                </button>
              </div>
            </form>
          </section>
        </Card>
      </main>
    </>
  );
}
