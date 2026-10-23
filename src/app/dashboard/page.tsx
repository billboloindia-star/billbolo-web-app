"use client";

import { useEffect, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { authFetch, getUser } from "@/lib/auth";

interface Quotation {
  quotation_id: string;
  client_name: string;
  grand_total: number;
  created_at: string;
}

interface LedgerSummary {
  total_owed: number;
  overdue_count: number;
}

export default function DashboardPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [qRes, lRes] = await Promise.all([
          authFetch("/api/quotations"),
          authFetch("/api/ledger"),
        ]);
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuotations(qData.quotations.slice(0, 5));
        }
        if (lRes.ok) {
          const lData = await lRes.json();
          setSummary(lData.summary);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const user = getUser();

  return (
    <ProtectedLayout>
      <h1 className="text-xl font-bold text-slate-900">
        {user ? `Welcome back, ${user.business_name}` : "Dashboard"}
      </h1>
      <p className="text-sm text-slate-500 mb-5">Here&apos;s what&apos;s happening in your business.</p>

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <a
          href="/ledger"
          className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100 transition-all"
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Total owed to you</p>
          <p className="text-2xl font-bold text-slate-900">
            ₹{(summary?.total_owed ?? 0).toLocaleString("en-IN")}
          </p>
          {summary && summary.overdue_count > 0 && (
            <p className="text-xs font-semibold text-red-600 mt-1.5">
              {summary.overdue_count} overdue
            </p>
          )}
        </a>
        <a
          href="/quotations"
          className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100 transition-all"
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Quotations</p>
          <p className="text-2xl font-bold text-slate-900">{quotations.length > 0 ? "View all" : "0"}</p>
          <p className="text-xs font-medium text-sky-600 mt-1.5">Create a new one →</p>
        </a>
      </div>

      <div className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Recent quotations</h2>
          <a href="/quotations" className="text-xs font-medium text-sky-600 hover:text-sky-700">
            See all →
          </a>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : quotations.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-3">No quotations yet.</p>
            <a
              href="/quotations"
              className="inline-block bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors"
            >
              Create your first quotation
            </a>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {quotations.map((q) => (
              <div key={q.quotation_id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-900">{q.client_name || "Untitled"}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(q.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  ₹{q.grand_total.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
