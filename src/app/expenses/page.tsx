"use client";

import { useEffect, useRef, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { authFetch } from "@/lib/auth";

interface Expense {
  expense_id: string;
  vendor: string;
  amount: number;
  notes: string;
  created_at: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadExpenses() {
    setLoading(true);
    try {
      const res = await authFetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await authFetch("/api/expenses", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't read that bill/receipt image.");
        return;
      }
      await loadExpenses();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <ProtectedLayout>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Expenses</h1>
      <p className="text-slate-500 mb-6">Photograph a bill or receipt — we&apos;ll read the amount automatically.</p>

      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
          id="expense-photo-input"
        />
        <label
          htmlFor="expense-photo-input"
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-sky-200 rounded-xl py-10 cursor-pointer hover:bg-sky-50 transition-colors ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <span className="text-3xl">📸</span>
          <span className="font-semibold text-sky-700">
            {uploading ? "Reading receipt…" : "Tap to photograph a bill/receipt"}
          </span>
        </label>
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Logged expenses</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-slate-400">No expenses logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((exp) => (
              <div key={exp.expense_id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">{exp.vendor || "Expense"}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(exp.created_at).toLocaleString("en-IN")} {exp.notes && `· ${exp.notes}`}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">
                  ₹{exp.amount.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
