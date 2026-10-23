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

interface Expense {
  amount: number;
  created_at: string;
}

const QUICK_ACTIONS = [
  {
    href: "/quotations",
    label: "New Quotation",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h6",
  },
  {
    href: "/expenses",
    label: "Log Expense",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9.5 13.5a2 2 0 1 1 1.4 1.9L9.5 17.5",
  },
  {
    href: "/clients",
    label: "Add Client",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    href: "/ledger",
    label: "Add to Ledger",
    icon: "M19 14l-7 7-7-7 M12 21V3",
  },
];

function Icon({ path, className = "w-5 h-5" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

function thisMonthTotal(items: { amount: number; created_at: string }[]): number {
  const ym = new Date().toISOString().slice(0, 7);
  return items.filter((i) => i.created_at.startsWith(ym)).reduce((sum, i) => sum + i.amount, 0);
}

export default function DashboardPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [clientCount, setClientCount] = useState(0);
  const [expensesThisMonth, setExpensesThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [qRes, lRes, cRes, eRes] = await Promise.all([
          authFetch("/api/quotations"),
          authFetch("/api/ledger"),
          authFetch("/api/clients"),
          authFetch("/api/expenses"),
        ]);
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuotations(qData.quotations.slice(0, 5));
        }
        if (lRes.ok) {
          const lData = await lRes.json();
          setSummary(lData.summary);
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          setClientCount(cData.clients.length);
        }
        if (eRes.ok) {
          const eData = await eRes.json();
          setExpensesThisMonth(thisMonthTotal(eData.expenses as Expense[]));
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <a
          href="/ledger"
          className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100 transition-all"
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Total owed to you</p>
          <p className="text-2xl font-bold text-slate-900">
            ₹{(summary?.total_owed ?? 0).toLocaleString("en-IN")}
          </p>
          {summary && summary.overdue_count > 0 && (
            <p className="text-xs font-semibold text-red-600 mt-1.5">{summary.overdue_count} overdue</p>
          )}
        </a>
        <a
          href="/quotations"
          className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100 transition-all"
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Quotations</p>
          <p className="text-2xl font-bold text-slate-900">{quotations.length}</p>
          <p className="text-xs font-medium text-sky-600 mt-1.5">Create a new one →</p>
        </a>
        <a
          href="/clients"
          className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100 transition-all"
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Clients saved</p>
          <p className="text-2xl font-bold text-slate-900">{clientCount}</p>
          <p className="text-xs font-medium text-sky-600 mt-1.5">Manage clients →</p>
        </a>
        <a
          href="/expenses"
          className="bg-white rounded-xl border border-sky-100 shadow-sky-100/60 p-4 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100 transition-all"
        >
          <p className="text-xs font-medium text-slate-500 mb-1">Expenses this month</p>
          <p className="text-2xl font-bold text-slate-900">
            ₹{expensesThisMonth.toLocaleString("en-IN")}
          </p>
          <p className="text-xs font-medium text-sky-600 mt-1.5">Log a receipt →</p>
        </a>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        {QUICK_ACTIONS.map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-600 to-blue-700 text-white rounded-xl p-4 shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 transition-all"
          >
            <Icon path={action.icon} className="w-5 h-5" />
            <span className="text-xs font-semibold text-center">{action.label}</span>
          </a>
        ))}
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
              className="inline-block bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 transition-all"
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
