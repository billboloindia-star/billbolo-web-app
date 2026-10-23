"use client";

import { useEffect, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { authFetch, saveSession, getToken } from "@/lib/auth";

interface ProfileUser {
  user_id: string;
  email: string;
  phone_number: string;
  business_name: string;
}

interface Plan {
  name: string;
  unlimited: boolean;
  quotations_used: number;
  quotations_limit: number | null;
  expenses_used: number;
  expenses_limit: number | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await authFetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPlan(data.plan);
        setBusinessName(data.user.business_name);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return;
    setSavingName(true);
    setNameMessage(null);
    setNameError(null);
    try {
      const res = await authFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: businessName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error || "Something went wrong.");
        return;
      }
      // Keep the locally-stored session user in sync so the nav bar updates too
      const token = getToken();
      if (token && user) {
        saveSession(token, { ...user, business_name: businessName });
      }
      setNameMessage("Saved.");
    } catch {
      setNameError("Couldn't reach the server.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authFetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Something went wrong.");
        return;
      }
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Couldn't reach the server.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <ProtectedLayout>
      <h1 className="text-xl font-bold text-slate-900">Profile</h1>
      <p className="text-sm text-slate-500 mb-5">Your plan, account details and password.</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {/* Current plan */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Current Plan</h2>
            <div className="flex items-center gap-3 mb-5">
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full ${
                  plan?.unlimited
                    ? "bg-amber-100 text-amber-700"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {plan?.name}
              </span>
              {plan?.unlimited && (
                <span className="text-sm text-slate-500">Unlimited usage</span>
              )}
            </div>
            {!plan?.unlimited && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Quotations this month</p>
                  <p className="font-semibold text-slate-900">
                    {plan?.quotations_used} / {plan?.quotations_limit}
                  </p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{
                        width: `${Math.min(
                          100,
                          ((plan?.quotations_used ?? 0) / (plan?.quotations_limit || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Expense scans this month</p>
                  <p className="font-semibold text-slate-900">
                    {plan?.expenses_used} / {plan?.expenses_limit}
                  </p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{
                        width: `${Math.min(
                          100,
                          ((plan?.expenses_used ?? 0) / (plan?.expenses_limit || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account details */}
          <form
            onSubmit={handleSaveName}
            className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4"
          >
            <h2 className="text-sm font-bold text-slate-900 mb-3">Account Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="text"
                    value={user?.email || ""}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone number
                  </label>
                  <input
                    type="text"
                    value={user?.phone_number || ""}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Email and phone number can&apos;t be changed here — contact support if you need to update them.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingName}
              className="mt-3 rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-semibold px-4 py-2 shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 transition-all disabled:opacity-50"
            >
              {savingName ? "Saving…" : "Save changes"}
            </button>
            {nameMessage && <p className="mt-3 text-sm text-green-700">{nameMessage}</p>}
            {nameError && <p className="mt-3 text-sm text-red-600">{nameError}</p>}
          </form>

          {/* Change password */}
          <form
            onSubmit={handleChangePassword}
            className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4"
          >
            <h2 className="text-sm font-bold text-slate-900 mb-3">Change Password</h2>
            <div className="space-y-4 max-w-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm new password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="mt-3 rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-semibold px-4 py-2 shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 transition-all disabled:opacity-50"
            >
              {savingPassword ? "Updating…" : "Update password"}
            </button>
            {passwordMessage && <p className="mt-3 text-sm text-green-700">{passwordMessage}</p>}
            {passwordError && <p className="mt-3 text-sm text-red-600">{passwordError}</p>}
          </form>
        </div>
      )}
    </ProtectedLayout>
  );
}
