"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthUser, SESSION_UPDATED_EVENT, clearSession, getToken, getUser } from "@/lib/auth";
import InstallPrompt from "@/components/InstallPrompt";

function Icon({ path, className = "w-[18px] h-[18px]" }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

const ICON_PATHS = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  quotations: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h6",
  clients: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  expenses: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9.5 13.5a2 2 0 1 1 1.4 1.9L9.5 17.5 M12 9v1 M12 17v1",
  ledger: "M19 14l-7 7-7-7 M12 21V3",
  profile: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  close: "M18 6L6 18 M6 6l12 12",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: ICON_PATHS.dashboard },
  { href: "/quotations", label: "Quotations", icon: ICON_PATHS.quotations },
  { href: "/clients", label: "Clients", icon: ICON_PATHS.clients },
  { href: "/expenses", label: "Expenses", icon: ICON_PATHS.expenses },
  { href: "/ledger", label: "Ledger", icon: ICON_PATHS.ledger },
  { href: "/profile", label: "Profile", icon: ICON_PATHS.profile },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    const storedUser = getUser();
    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }
    setUser(storedUser);
    setChecked(true);

    const onSessionUpdated = () => setUser(getUser());
    window.addEventListener(SESSION_UPDATED_EVENT, onSessionUpdated);
    return () => window.removeEventListener(SESSION_UPDATED_EVENT, onSessionUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-cyan-50">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  const initials = (user?.business_name || "B")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <a href="/dashboard" className="flex items-center gap-2 px-5 h-14 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-full.svg" alt="BillBolo" className="h-6 w-auto" />
      </a>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon path={item.icon} className={`w-[18px] h-[18px] shrink-0 ${active ? "text-sky-600" : "text-slate-400"}`} />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <p className="text-sm font-medium text-slate-700 truncate">{user?.business_name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Icon path={ICON_PATHS.logout} className="w-[18px] h-[18px] shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-sky-100 md:bg-white/90 md:backdrop-blur-sm md:fixed md:inset-y-0">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-sky-100 flex items-center justify-between px-4 h-14">
        <a href="/dashboard" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.svg" alt="BillBolo" className="h-6 w-auto" />
        </a>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-slate-500 p-1"
        >
          <Icon path={ICON_PATHS.menu} className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-end px-3 h-14 border-b border-slate-100">
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="text-slate-500 p-1"
              >
                <Icon path={ICON_PATHS.close} className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      <main className="flex-1 md:ml-60 px-4 sm:px-6 py-6 max-w-4xl">{children}</main>
      <InstallPrompt />
    </div>
  );
}
