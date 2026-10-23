"use client";

import { useEffect, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { authFetch } from "@/lib/auth";

interface Client {
  client_id: string;
  name: string;
  phone: string;
  notes: string;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadClients() {
    setLoading(true);
    try {
      const res = await authFetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setName("");
      setPhone("");
      setNotes("");
      setShowForm(false);
      await loadClients();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(clientId: string) {
    await authFetch(`/api/clients/${clientId}`, { method: "DELETE" });
    await loadClients();
  }

  return (
    <ProtectedLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Clients</h1>
          <p className="text-slate-500">Save clients once, reuse them on future quotations.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold px-5 py-2.5 shadow-md hover:shadow-lg transition-all"
        >
          {showForm ? "Cancel" : "+ Add client"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 mb-6 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 text-white font-semibold px-5 py-2.5 hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save client"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-slate-400">No clients saved yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {clients.map((c) => (
              <div key={c.client_id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-400">
                    {c.phone} {c.notes && `· ${c.notes}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(c.client_id)}
                  className="text-sm text-slate-400 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
