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

export default function LedgerClient() {
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
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ledger</h1>
          <p className="text-sm text-slate-500">Track who owes you money, and follow up before it&apos;s forgotten.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-semibold px-4 py-2 shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 transition-all shrink-0"
        >
          {showForm ? "Cancel" : "+ Add entry"}
        </button>
      </div>

      {summary && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Total owed to you</p>
            <p className="text-xl font-bold text-slate-900">
              ₹{summary.total_owed.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Overdue</p>
            <p className={`text-xl font-bold ${summary.overdue_count > 0 ? "text-red-600" : "text-slate-900"}`}>
              {summary.overdue_count}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 mb-4 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Who owes you?"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (₹)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What for? (optional)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-semibold px-4 py-2 shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add to ledger"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const overdue = isOverdue(entry);
              return (
                <div key={entry.ledger_id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{entry.client_name}</p>
                      {entry.status === "paid" && (
                        <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                          Paid
                        </span>
                      )}
                      {overdue && (
                        <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {entry.description || "—"}
                      {entry.due_date && ` · due ${entry.due_date}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      ₹{entry.amount.toLocaleString("en-IN")}
                    </p>
                    {entry.status === "owed" && (
                      <button
                        onClick={() => handleMarkPaid(entry.ledger_id)}
                        className="text-xs font-medium text-sky-600 hover:text-sky-700"
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
