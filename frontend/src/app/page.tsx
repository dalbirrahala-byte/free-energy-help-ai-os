"use client";

import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/", active: true },
  { name: "Leads", icon: Users, href: "/leads" },
  { name: "Customers", icon: Building2, href: "/customers" },
  { name: "Quotes", icon: FileText, href: "/quotes" },
  { name: "Appointments", icon: CalendarDays, href: "/appointments" },
  { name: "Reports", icon: BarChart3, href: "/reports" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function Home() {
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

              return (
                <Link
  key={item.name}
  href={item.href}
  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
    item.active
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
            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
              <LogOut size={19} />
              Sign out
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <section className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                className="rounded-lg border border-slate-200 p-2 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={22} />
              </button>

              <div>
                <h1 className="text-xl font-bold">Dashboard</h1>
                <p className="text-sm text-slate-500">
                  Welcome back to your energy sales command centre.
                </p>
              </div>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">Dalbir Rahala</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </header>

          <div className="p-5 lg:p-8">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="New Leads" value="24" change="+12% this month" />
              <StatCard title="Active Quotes" value="11" change="4 need follow-up" />
              <StatCard title="Customers" value="138" change="+7 this month" />
              <StatCard title="Pipeline Value" value="£86,400" change="+18% this month" />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">Sales Pipeline</h2>
                    <p className="text-sm text-slate-500">
                      Current opportunities by stage
                    </p>
                  </div>

                  <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                    Add lead
                  </button>
                </div>

                <div className="space-y-4">
                  <PipelineRow label="New enquiries" value={18} width="85%" />
                  <PipelineRow label="Contacted" value={14} width="70%" />
                  <PipelineRow label="Quote sent" value={9} width="48%" />
                  <PipelineRow label="Negotiation" value={6} width="32%" />
                  <PipelineRow label="Won" value={4} width="22%" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold">Today’s Tasks</h2>
                <p className="mb-5 text-sm text-slate-500">
                  Important actions requiring attention
                </p>

                <div className="space-y-3">
                  <Task text="Call Derby Manufacturing Ltd" />
                  <Task text="Send renewal quote to Green Oak Hotels" />
                  <Task text="Review EDF contract documents" />
                  <Task text="Follow up live transfer leads" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs font-medium text-emerald-600">{change}</p>
    </div>
  );
}

function PipelineRow({
  label,
  value,
  width,
}: {
  label: string;
  value: number;
  width: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>

      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width }}
        />
      </div>
    </div>
  );
}

function Task({ text }: { text: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
      <input type="checkbox" className="mt-1 h-4 w-4" />
      <span className="text-sm">{text}</span>
    </label>
  );
}