"use client";

import { useEffect, useRef, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { authFetch } from "@/lib/auth";

interface LineItem {
  item_name: string;
  quantity: number;
  rate: number;
  unit: string;
  amount: number;
  hsn_code: string | null;
}

interface Expense {
  expense_id: string;
  vendor: string;
  amount: number;
  notes: string;
  items: LineItem[];
  created_at: string;
  seller_name: string;
  seller_gstin: string;
  seller_address: string;
  billing_address: string;
  shipping_address: string;
  order_date: string;
}

function hasDetails(exp: Expense): boolean {
  return Boolean(
    exp.seller_gstin ||
      exp.seller_address ||
      exp.billing_address ||
      exp.shipping_address ||
      exp.order_date ||
      (exp.items || []).some((i) => i.hsn_code)
  );
}

function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVendor, setEditVendor] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  function startEdit(exp: Expense) {
    setEditingId(exp.expense_id);
    setEditVendor(exp.vendor);
    setEditAmount(String(exp.amount));
    setEditNotes(exp.notes);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSaveEdit(expenseId: string) {
    setSaving(true);
    setEditError(null);
    try {
      const res = await authFetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor: editVendor, amount: parseFloat(editAmount), notes: editNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Something went wrong.");
        return;
      }
      setEditingId(null);
      await loadExpenses();
    } catch {
      setEditError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Delete this expense? This can't be undone.")) return;
    await authFetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    await loadExpenses();
  }

  return (
    <ProtectedLayout>
      <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
      <p className="text-sm text-slate-500 mb-5">Photograph a bill or receipt — we&apos;ll read the amount automatically.</p>

      <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
          id="expense-photo-input"
        />
        <label
          htmlFor="expense-photo-input"
          className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-sky-200 rounded-lg py-8 cursor-pointer hover:bg-sky-50 transition-colors ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <span className="text-2xl">📸</span>
          <span className="text-sm font-semibold text-sky-700">
            {uploading ? "Reading receipt…" : "Tap to photograph a bill/receipt"}
          </span>
        </label>
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Logged expenses</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-slate-400">No expenses logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((exp) => {
              const hsnItems = (exp.items || []).filter((i) => i.hsn_code);
              const isEditing = editingId === exp.expense_id;

              return (
                <div key={exp.expense_id} className="py-3">
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={editVendor}
                          onChange={(e) => setEditVendor(e.target.value)}
                          placeholder="Vendor"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="Amount (₹)"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Notes"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(exp.expense_id)}
                          disabled={saving}
                          className="rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 text-white text-xs font-semibold px-3 py-1.5 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{exp.vendor || "Expense"}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(exp.created_at).toLocaleString("en-IN")} {exp.notes && `· ${exp.notes}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-sm font-semibold text-slate-900">₹{formatInr(exp.amount)}</p>
                          {hasDetails(exp) && (
                            <button
                              onClick={() =>
                                setExpandedId(expandedId === exp.expense_id ? null : exp.expense_id)
                              }
                              className="text-xs font-medium text-sky-600 hover:text-sky-700"
                            >
                              {expandedId === exp.expense_id ? "Hide" : "Details"}
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(exp)}
                            className="text-xs font-medium text-sky-600 hover:text-sky-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(exp.expense_id)}
                            className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {expandedId === exp.expense_id && (
                        <div className="mt-2.5 bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1.5">
                          {exp.seller_name && (
                            <p>
                              <span className="font-semibold text-slate-700">Seller:</span> {exp.seller_name}
                              {exp.seller_gstin && ` · GSTIN: ${exp.seller_gstin}`}
                            </p>
                          )}
                          {exp.seller_address && (
                            <p>
                              <span className="font-semibold text-slate-700">Seller address:</span>{" "}
                              {exp.seller_address}
                            </p>
                          )}
                          {exp.order_date && (
                            <p>
                              <span className="font-semibold text-slate-700">Order date:</span> {exp.order_date}
                            </p>
                          )}
                          {exp.billing_address && (
                            <p>
                              <span className="font-semibold text-slate-700">Billing address:</span>{" "}
                              {exp.billing_address}
                            </p>
                          )}
                          {exp.shipping_address && (
                            <p>
                              <span className="font-semibold text-slate-700">Shipping address:</span>{" "}
                              {exp.shipping_address}
                            </p>
                          )}
                          {hsnItems.length > 0 && (
                            <div>
                              <span className="font-semibold text-slate-700">HSN codes:</span>
                              <ul className="list-disc list-inside">
                                {hsnItems.map((i, idx) => (
                                  <li key={idx}>
                                    {i.item_name} — {i.hsn_code}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
