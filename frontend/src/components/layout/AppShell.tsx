"use client";

import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PhoneCall,
  PoundSterling,
  RefreshCw,
  ScrollText,
  Settings,
  Factory,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "AI Operations", icon: Bot, href: "/ai-operations" },
  { name: "Renewals", icon: RefreshCw, href: "/renewals" },
  { name: "Commission Intelligence", icon: PoundSterling, href: "/commissions" },
  { name: "Supplier Intelligence", icon: Factory, href: "/suppliers" },
  { name: "Contracts", icon: ScrollText, href: "/contracts" },
  { name: "Live Transfers", icon: PhoneCall, href: "/live-transfers" },
  { name: "Leads", icon: Users, href: "/leads" },
  { name: "Customers", icon: Building2, href: "/customers" },
  { name: "Quotes", icon: FileText, href: "/quotes" },
  { name: "Appointments", icon: CalendarDays, href: "/appointments" },
  { name: "Reports", icon: BarChart3, href: "/reports" },
  { name: "Automation Centre", icon: Workflow, href: "/automation" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

type AppShellProps = {
  activeHref?: string;
  title: string;
  subtitle: string;
  headerContext?: string;
  children: React.ReactNode;
};

export function AppShell({
  activeHref = "/",
  title,
  subtitle,
  headerContext = "Mission Control",
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-950 text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <Zap size={22} />
            </div>

            <div>
              <p className="font-bold">Free Energy Help</p>
              <p className="text-xs text-slate-400">AI Sales OS</p>
            </div>
          </div>

          <nav className="space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.href === activeHref;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-emerald-500 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-full border-t border-slate-800 p-4">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut size={19} />
              Sign out
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <section className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-2 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={22} />
              </button>

              <div>
                <h1 className="text-xl font-bold">{title}</h1>
                <p className="text-sm text-slate-500">{subtitle}</p>
              </div>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">Operations</p>
              <p className="text-xs text-slate-500">{headerContext}</p>
            </div>
          </header>

          <div className="p-5 lg:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
