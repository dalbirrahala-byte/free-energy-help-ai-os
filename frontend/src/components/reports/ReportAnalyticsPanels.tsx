import { SectionCard } from "@/components/dashboard/SectionCard";
import type {
  AccountManagerRow,
  CommissionForecast,
  CustomerAnalyticsBlock,
  LiveTransferAnalytics,
  RenewalForecast,
  ReportAlert,
  SalesPerformance,
  SectorAnalyticsRow,
  SupplierAnalyticsRow,
} from "@/lib/reports/types";
import type { PipelineStageRow } from "@/lib/reports/types";

export function SalesPerformancePanel({ sales }: { sales: SalesPerformance }) {
  return (
    <SectionCard title="Sales performance" description="Demo data">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Quotes created", sales.quotesCreated],
          ["Quotes sent", sales.quotesSent],
          ["Quotes accepted", sales.quotesAccepted],
          ["Contracts won", sales.contractsWon],
          ["Contracts lost", sales.contractsLost],
          ["Average quote value", sales.averageQuoteValue],
          ["Average contract term", sales.averageContractTerm],
          ["Average sales cycle", sales.averageSalesCycle],
          ["Conversion trend", sales.conversionTrend],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
            <dd className="text-sm font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function AccountManagerLeagueTable({ rows }: { rows: AccountManagerRow[] }) {
  return (
    <SectionCard title="Account manager league table" description="Demo performance">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <caption className="sr-only">Account manager league</caption>
          <thead className="bg-slate-50">
            <tr>
              {[
                "Rank",
                "Manager",
                "Leads",
                "Quotes",
                "Won",
                "Renewals",
                "Live transfers",
                "Conversion",
                "Commission",
                "Tasks",
              ].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2">#{r.performanceRank}</td>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2">{r.newLeads}</td>
                <td className="px-3 py-2">{r.quotes}</td>
                <td className="px-3 py-2">{r.contractsWon}</td>
                <td className="px-3 py-2">{r.renewalsRetained}</td>
                <td className="px-3 py-2">{r.liveTransfersHandled}</td>
                <td className="px-3 py-2">{r.conversionRate}</td>
                <td className="px-3 py-2">{r.demoCommission} (demo)</td>
                <td className="px-3 py-2">{r.outstandingTasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function RenewalForecastPanel({ data }: { data: RenewalForecast }) {
  return (
    <SectionCard title="Renewal forecast" description="Demo data">
      <dl className="grid gap-3 sm:grid-cols-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{key}</dt>
            <dd className="text-sm text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function CommissionForecastPanel({ data }: { data: CommissionForecast }) {
  return (
    <SectionCard title="Commission forecast" description="Demo — Commission Intelligence patterns">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Expected", data.expected],
          ["Paid", data.paid],
          ["Outstanding", data.outstanding],
          ["Overdue", data.overdue],
          ["Disputed", data.disputed],
          ["Monthly forecast", data.monthlyForecast],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
            <dd className="text-sm text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Supplier breakdown" items={data.supplierBreakdown.map((s) => `${s.supplier}: ${s.amount} (demo)`)} />
        <BreakdownList title="Account manager breakdown" items={data.managerBreakdown.map((m) => `${m.manager}: ${m.amount} (demo)`)} />
      </div>
    </SectionCard>
  );
}

function BreakdownList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function PipelineAnalyticsPanel({ rows }: { rows: PipelineStageRow[] }) {
  return (
    <SectionCard title="Pipeline analytics" description="Demo funnel">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Stage", "Count", "Est. value", "Conversion", "Avg days", "Bottleneck"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.stage} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">{r.stage}</td>
                <td className="px-3 py-2">{r.count}</td>
                <td className="px-3 py-2">{r.estimatedValue}</td>
                <td className="px-3 py-2">{r.conversionToNext}</td>
                <td className="px-3 py-2">{r.avgDaysInStage}</td>
                <td className="px-3 py-2">{r.bottleneck}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function CustomerAnalyticsPanel({ data }: { data: CustomerAnalyticsBlock }) {
  const blocks: [string, string[]][] = [
    ["Largest customers", data.largestCustomers],
    ["Most profitable", data.mostProfitable],
    ["At risk", data.atRisk],
    ["Recently added", data.recentlyAdded],
    ["No recent contact", data.noRecentContact],
    ["Missing data", data.missingData],
    ["Multi-site", data.multiSite],
  ];

  return (
    <SectionCard title="Customer analytics" description="Demo data">
      <div className="grid gap-4 lg:grid-cols-2">
        {blocks.map(([title, items]) => (
          <BreakdownList key={title} title={title} items={items} />
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Average customer lifetime value: {data.avgLtvPlaceholder}
      </p>
    </SectionCard>
  );
}

export function SectorAnalyticsTable({ rows }: { rows: SectorAnalyticsRow[] }) {
  return (
    <SectionCard title="Sector analytics" description="Demo data">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Sector",
                "Customers",
                "Consumption",
                "Contract value",
                "Win rate",
                "Retention",
                "Commission",
              ].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sector} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">{r.sector}</td>
                <td className="px-3 py-2">{r.customerCount}</td>
                <td className="px-3 py-2">{r.annualConsumption}</td>
                <td className="px-3 py-2">{r.contractValue}</td>
                <td className="px-3 py-2">{r.quoteWinRate}</td>
                <td className="px-3 py-2">{r.renewalRetention}</td>
                <td className="px-3 py-2">{r.demoCommission}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function SupplierAnalyticsPanel({ rows }: { rows: SupplierAnalyticsRow[] }) {
  return (
    <SectionCard title="Supplier analytics" description="Demo — Supplier Intelligence patterns">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Supplier",
                "Quotes",
                "Wins",
                "Acceptance",
                "Turnaround",
                "Paid",
                "Outstanding",
                "Payment days",
                "Service",
                "Risk",
              ].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.supplier} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold">{r.supplier}</td>
                <td className="px-3 py-2">{r.quotes}</td>
                <td className="px-3 py-2">{r.wins}</td>
                <td className="px-3 py-2">{r.acceptanceRate}</td>
                <td className="px-3 py-2">{r.turnaround}</td>
                <td className="px-3 py-2">{r.commissionPaid} (demo)</td>
                <td className="px-3 py-2">{r.commissionOutstanding} (demo)</td>
                <td className="px-3 py-2">{r.avgPaymentDays}</td>
                <td className="px-3 py-2">{r.serviceRating}</td>
                <td className="px-3 py-2">{r.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function LiveTransferAnalyticsPanel({ data }: { data: LiveTransferAnalytics }) {
  return (
    <SectionCard title="Live transfer analytics" description="Demo — Live Transfer Command Centre patterns">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Received", data.transfersReceived],
          ["Qualified", data.transfersQualified],
          ["Converted", data.transfersConverted],
          ["Avg wait", data.avgWaitTime],
          ["Demo revenue", data.demoRevenue],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
            <dd className="text-sm text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BreakdownList title="Conversion by agent" items={data.conversionByAgent.map((a) => `${a.agent}: ${a.rate}`)} />
        <BreakdownList title="Conversion by source" items={data.conversionBySource.map((s) => `${s.source}: ${s.rate}`)} />
        <BreakdownList title="Lost transfer reasons" items={data.lostReasons} />
      </div>
    </SectionCard>
  );
}

export function AlertsExceptionsPanel({ alerts }: { alerts: ReportAlert[] }) {
  const styles = {
    high: "border-red-200 bg-red-50 text-red-900",
    medium: "border-amber-200 bg-amber-50 text-amber-950",
    low: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <SectionCard title="Alerts and exceptions" description="Demo monitoring">
      <ul className="grid gap-2 md:grid-cols-2">
        {alerts.map((a) => (
          <li key={a.id} className={`rounded-xl border px-4 py-3 text-sm ${styles[a.severity]}`}>
            <p className="font-semibold">{a.category}</p>
            <p>{a.message}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
