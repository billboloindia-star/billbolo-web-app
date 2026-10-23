"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, saveSession } from "@/lib/auth";

export default function LoginClient() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      saveSession(data.token, data.user);
      router.push("/dashboard");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex flex-col">
      <nav className="border-b border-sky-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.svg" alt="BillBolo" className="h-8 w-auto" />
          </a>
          <a href="/signup" className="text-sm font-medium text-sky-600 hover:text-sky-700">
            New here? Create an account
          </a>
        </div>
      </nav>

      <div className="flex-1 max-w-md w-full mx-auto px-6 py-14">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome back</h1>
          <p className="text-slate-600">Log in with your email or phone number.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-sky-100 shadow-lg shadow-sky-100/50 p-6 sm:p-8 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email or phone number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or +91 98765 43210"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold py-3 shadow-lg shadow-sky-600/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
