"use client";

import { useEffect, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { authFetch } from "@/lib/auth";

interface LedgerEntry {
  ledger_id: string;
  client_name: string;
  amount: number;
  description: string;
  due_date: string;
  status: "owed" | "paid";
  created_at: string;
  paid_at: string;
}

interface Summary {
  total_owed: number;
  overdue_count: number;
}

function isOverdue(entry: LedgerEntry): boolean {
  if (entry.status !== "owed" || !entry.due_date) return false;
  return entry.due_date < new Date().toISOString().slice(0, 10);
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLedger() {
    setLoading(true);
    try {
      const res = await authFetch("/api/ledger");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setSummary(data.summary);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLedger();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !amount) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          amount: parseFloat(amount),
          description,
          due_date: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setClientName("");
      setAmount("");
      setDescription("");
      setDueDate("");
      setShowForm(false);
      await loadLedger();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(ledgerId: string) {
    await authFetch(`/api/ledger/${ledgerId}/paid`, { method: "PATCH" });
    await loadLedger();
  }

  return (
    <ProtectedLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Ledger</h1>
          <p className="text-slate-500">Track who owes you money, and follow up before it&apos;s forgotten.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold px-5 py-2.5 shadow-md hover:shadow-lg transition-all"
        >
          {showForm ? "Cancel" : "+ Add entry"}
        </button>
      </div>

      {summary && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
            <p className="text-sm text-slate-500 mb-1">Total owed to you</p>
            <p className="text-2xl font-extrabold text-slate-900">
              ₹{summary.total_owed.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
            <p className="text-sm text-slate-500 mb-1">Overdue</p>
            <p className={`text-2xl font-extrabold ${summary.overdue_count > 0 ? "text-red-600" : "text-slate-900"}`}>
              {summary.overdue_count}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 mb-6 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Who owes you?"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (₹)"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What for? (optional)"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 text-white font-semibold px-5 py-2.5 hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add to ledger"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const overdue = isOverdue(entry);
              return (
                <div key={entry.ledger_id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{entry.client_name}</p>
                      {entry.status === "paid" && (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          Paid
                        </span>
                      )}
                      {overdue && (
                        <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {entry.description || "—"}
                      {entry.due_date && ` · due ${entry.due_date}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-slate-900">
                      ₹{entry.amount.toLocaleString("en-IN")}
                    </p>
                    {entry.status === "owed" && (
                      <button
                        onClick={() => handleMarkPaid(entry.ledger_id)}
                        className="text-sm font-medium text-sky-600 hover:text-sky-700"
                      >
                        Mark paid
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
