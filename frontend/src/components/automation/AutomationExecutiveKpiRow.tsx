import { StatCard } from "@/components/dashboard/StatCard";
import type { AutomationExecutiveKpis } from "@/lib/automation/types";

export function AutomationExecutiveKpiRow({ kpis }: { kpis: AutomationExecutiveKpis }) {
  const labels: Record<keyof AutomationExecutiveKpis, string> = {
    activeWorkflows: "Active workflows",
    pausedWorkflows: "Paused workflows",
    awaitingApproval: "Workflows requiring approval",
    failedRuns: "Failed workflow runs",
    successfulRunsToday: "Successful runs today",
    tasksCreatedAuto: "Tasks created automatically",
    customersContactedAuto: "Customers contacted automatically",
    demoTimeSaved: "Estimated demo time saved",
  };

  return (
    <section aria-labelledby="automation-exec-kpis">
      <h2 id="automation-exec-kpis" className="text-lg font-bold text-slate-900">
        Automation executive summary
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(kpis).map(([key, value]) => (
          <StatCard
            key={key}
            title={labels[key as keyof AutomationExecutiveKpis]}
            value={value}
            hint="Demo data"
          />
        ))}
      </div>
    </section>
  );
}
