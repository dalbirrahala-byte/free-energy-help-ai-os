"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { DemoTrendChart } from "@/components/reports/DemoTrendChart";
import { AI_ASSISTANT_DISCONNECTED, AI_SUGGESTED_PROMPTS } from "@/lib/customer-360/constants";
import { buildConsumptionTrendSeries, filterContractsByFuel } from "@/lib/customer-360/analytics";
import type { Customer360Tab, Customer360View, Opportunity360Row } from "@/lib/customer-360/types";

import { AiRecommendationsPanel } from "./AiRecommendationsPanel";
import { Customer360Table } from "./Customer360Table";
import { Customer360Timeline } from "./Customer360Timeline";
import { DemoBadge } from "./DemoBadge";

type Customer360TabPanelsProps = {
  tab: Customer360Tab;
  view: Customer360View;
};

export function Customer360TabPanels({ tab, view }: Customer360TabPanelsProps) {
  const panelId = `panel-tab-${tab.replace(/\s+/g, "-").toLowerCase()}`;
  const tabId = `tab-${tab.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      className="space-y-6"
    >
      {renderPanel(tab, view)}
    </div>
  );
}

function renderPanel(tab: Customer360Tab, view: Customer360View) {
  switch (tab) {
    case "Overview":
      return <OverviewPanel view={view} />;
    case "Contacts":
      return <ContactsPanel view={view} />;
    case "Sites":
      return <SitesPanel view={view} />;
    case "Contracts":
      return <ContractsPanel view={view} />;
    case "Electricity Contracts":
      return (
        <FuelContractsPanel
          view={view}
          fuel="Electricity"
          meterSection={
            <SectionCard title="Electricity meters" description="Demo MPAN register">
              <Customer360Table
                caption="Electricity meters"
                headers={[
                  "MPAN",
                  "Profile",
                  "Serial",
                  "HH/NHH",
                  "Supplier",
                  "Annual consumption",
                  "Status",
                ]}
                rows={view.demo.electricityMeters.map((m) => [
                  m.mpan,
                  m.profileClass,
                  m.meterSerial,
                  m.hhNhh,
                  m.currentSupplier,
                  m.annualConsumption,
                  m.status,
                ])}
              />
            </SectionCard>
          }
        />
      );
    case "Gas Contracts":
      return (
        <FuelContractsPanel
          view={view}
          fuel="Gas"
          meterSection={
            <SectionCard title="Gas meters" description="Demo MPRN register">
              <Customer360Table
                caption="Gas meters"
                headers={["MPRN", "Serial", "AQ", "Supplier", "Status"]}
                rows={view.demo.gasMeters.map((m) => [
                  m.mprn,
                  m.meterSerial,
                  m.aq,
                  m.currentSupplier,
                  m.status,
                ])}
              />
            </SectionCard>
          }
        />
      );
    case "Meters":
      return <MetersPanel view={view} />;
    case "Consumption":
      return <ConsumptionPanel view={view} />;
    case "Renewals":
      return <RenewalsPanel view={view} />;
    case "Live Transfers":
      return <LiveTransfersPanel view={view} />;
    case "Quotes":
      return <QuotesPanel view={view} />;
    case "Bills":
      return <BillsPanel view={view} />;
    case "Commission":
      return <CommissionPanel view={view} />;
    case "Tasks":
      return <TasksPanel view={view} />;
    case "Activities":
      return <ActivitiesPanel view={view} />;
    case "Appointments":
      return <AppointmentsPanel view={view} />;
    case "Documents":
      return <DocumentsPanel view={view} />;
    case "Timeline":
      return (
        <SectionCard title="Unified timeline" description="Live CRM events and demo module events">
          <Customer360Timeline entries={view.timeline} />
        </SectionCard>
      );
    case "Notes":
      return <NotesPanel view={view} />;
    case "Credit Status":
      return <CreditStatusPanel view={view} />;
    case "Opportunities":
      return <OpportunitiesPanel view={view} />;
    case "AI Assistant":
      return <AiAssistantPanel view={view} />;
    default:
      return null;
  }
}

function OverviewPanel({ view }: { view: Customer360View }) {
  const o = view.overview;

  return (
    <div className="space-y-6">
      <SectionCard title="Customer profile" description="Live CRM fields">
        <dl className="grid gap-4 sm:grid-cols-2">
          <OverviewItem label="Profile" value={o.profileSummary} />
          <OverviewItem label="Primary contact" value={view.header.primaryContact} />
          <OverviewItem label="Primary site" value={o.primarySiteName} />
          <OverviewItem label="Primary site address" value={o.primarySiteAddress} />
          <OverviewItem label="Current supply position" value={o.supplyPosition} />
        </dl>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Latest activity" description="Live CRM">
          <p className="text-sm text-slate-700">{o.latestActivitySummary}</p>
        </SectionCard>
        <SectionCard title="Upcoming tasks" description="Live CRM">
          <p className="text-sm text-slate-700">{o.upcomingTasksSummary}</p>
          <Link href="/tasks" className="mt-3 inline-block text-sm font-semibold text-emerald-600">
            Open tasks →
          </Link>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Renewal summary" description="Primary site countdown">
          <p className="text-sm text-slate-700">{o.renewalSummary}</p>
          <Link href="/renewals" className="mt-3 inline-block text-sm font-semibold text-emerald-600">
            Renewals Intelligence →
          </Link>
        </SectionCard>
        <SectionCard title="Open quotes" description="Demo register">
          <p className="text-sm text-slate-700">{o.openQuoteSummary}</p>
        </SectionCard>
        <SectionCard title="Commission summary" description="Demo figures">
          <p className="text-sm text-slate-700">{o.commissionSummary}</p>
          <Link href="/commissions" className="mt-3 inline-block text-sm font-semibold text-emerald-600">
            Commission Intelligence →
          </Link>
        </SectionCard>
      </div>

      <SectionCard title="AI recommendations" description="Demonstration only — AI Insights">
        <AiRecommendationsPanel recommendations={view.demo.aiRecommendations} />
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Credit status" description="Demo credit file">
          <p className="text-sm text-slate-700">{view.demo.creditStatus.overallRating}</p>
          <p className="mt-2 text-sm text-slate-600">{view.demo.creditStatus.notes}</p>
        </SectionCard>
        <SectionCard title="Opportunities" description="Customer-specific demo register">
          <OpportunityTeaserList opportunities={view.demo.opportunities} />
        </SectionCard>
      </div>
    </div>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function OpportunityTeaserList({ opportunities }: { opportunities: Opportunity360Row[] }) {
  if (opportunities.length === 0) {
    return <p className="text-sm text-slate-500">No demo opportunities for this customer.</p>;
  }

  return (
    <ul className="space-y-2">
      {opportunities.slice(0, 2).map((item) => (
        <li key={item.id} className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{item.title}</span>
          <span className="text-slate-500"> · {item.estimatedValue}</span>
          <DemoBadge compact />
        </li>
      ))}
    </ul>
  );
}

function ContactsPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Contacts" description="Live primary contact and demonstration secondary contacts">
      <Customer360Table
        caption="Customer contacts"
        headers={["Name", "Role", "Telephone", "Email", "Primary", "Source"]}
        rows={view.contacts.map((contact) => [
          contact.name,
          contact.role,
          contact.telephone,
          contact.email,
          contact.isPrimary ? "Yes" : "—",
          contact.source === "live" ? (
            "Live CRM"
          ) : (
            <>
              Demo <DemoBadge compact />
            </>
          ),
        ])}
        emptyMessage="No contacts on file — add primary contact via Edit customer."
      />
      <Link
        href={`/customers/${view.customerId}/edit`}
        className="mt-4 inline-block text-sm font-semibold text-emerald-600"
      >
        Edit primary contact →
      </Link>
    </SectionCard>
  );
}

function FuelContractsPanel({
  view,
  fuel,
  meterSection,
}: {
  view: Customer360View;
  fuel: "Electricity" | "Gas";
  meterSection: ReactNode;
}) {
  const contracts = filterContractsByFuel(view.demo.contracts, fuel);

  return (
    <div className="space-y-6">
      <SectionCard
        title={`${fuel} contracts`}
        description="Demo contract register — not live"
      >
        <Customer360Table
          caption={`${fuel} contracts`}
          headers={[
            "Supplier",
            "Type",
            "Start",
            "End",
            "Term",
            "Status",
            "Consumption",
            "EACV",
            "Demo commission",
            "Renewal window",
          ]}
          rows={contracts.map((c) => [
            <>
              {c.supplier} <DemoBadge compact />
            </>,
            c.contractType,
            c.startLabel,
            c.endLabel,
            c.term,
            c.status,
            c.annualConsumption,
            c.estimatedAnnualValue,
            c.demoCommission,
            c.renewalWindow,
          ])}
          emptyMessage={`No demo ${fuel.toLowerCase()} contracts on register.`}
        />
      </SectionCard>
      {meterSection}
    </div>
  );
}

function SitesPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Sites" description="Live CRM site register with demo meter counts">
      <Customer360Table
        caption="Customer sites"
        headers={[
          "Site",
          "Address",
          "Postcode",
          "Primary",
          "Supplier",
          "Contract end",
          "Elec meters",
          "Gas meters",
          "Status",
        ]}
        rows={view.sites.map((site) => [
          site.siteName,
          site.address,
          site.postcode,
          site.isPrimary ? "Yes" : "—",
          site.currentSupplier,
          site.contractEndLabel,
          site.electricityMeterCount,
          site.gasMeterCount,
          site.status,
        ])}
        emptyMessage="No sites in CRM — add via Edit customer."
      />
    </SectionCard>
  );
}

function ContractsPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Contracts" description="Demo contract register — not live">
      <Customer360Table
        caption="Contracts"
        headers={[
          "Supplier",
          "Fuel",
          "Type",
          "Start",
          "End",
          "Term",
          "Status",
          "Consumption",
          "EACV",
          "Demo commission",
          "Renewal window",
        ]}
        rows={view.demo.contracts.map((c) => [
          <>
            {c.supplier} <DemoBadge compact />
          </>,
          c.fuelType,
          c.contractType,
          c.startLabel,
          c.endLabel,
          c.term,
          c.status,
          c.annualConsumption,
          c.estimatedAnnualValue,
          c.demoCommission,
          c.renewalWindow,
        ])}
      />
    </SectionCard>
  );
}

function MetersPanel({ view }: { view: Customer360View }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Electricity meters" description="Demo MPAN register">
        <Customer360Table
          caption="Electricity meters"
          headers={[
            "MPAN",
            "Profile",
            "Serial",
            "HH/NHH",
            "Supplier",
            "Annual consumption",
            "Status",
          ]}
          rows={view.demo.electricityMeters.map((m) => [
            m.mpan,
            m.profileClass,
            m.meterSerial,
            m.hhNhh,
            m.currentSupplier,
            m.annualConsumption,
            m.status,
          ])}
        />
      </SectionCard>
      <SectionCard title="Gas meters" description="Demo MPRN register">
        <Customer360Table
          caption="Gas meters"
          headers={["MPRN", "Serial", "AQ", "Supplier", "Status"]}
          rows={view.demo.gasMeters.map((m) => [
            m.mprn,
            m.meterSerial,
            m.aq,
            m.currentSupplier,
            m.status,
          ])}
        />
      </SectionCard>
    </div>
  );
}

function ConsumptionPanel({ view }: { view: Customer360View }) {
  const c = view.demo.consumption;
  const trendSeries = buildConsumptionTrendSeries(c);

  return (
    <SectionCard title="Consumption" description="Demo analytics — not connected to HH feeds">
      <dl className="grid gap-4 sm:grid-cols-2">
        <OverviewItem label="Electricity (annual)" value={c.electricityAnnualKwh} />
        <OverviewItem label="Gas (annual)" value={c.gasAnnualKwh} />
        <OverviewItem label="Peak usage" value={c.peakUsage} />
        <OverviewItem label="Estimated annual spend" value={c.estimatedAnnualSpend} />
      </dl>
      <h4 className="mt-6 text-sm font-bold text-slate-900">Consumption charts (demo)</h4>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {trendSeries.map((series) => (
          <DemoTrendChart key={series.id} series={series} />
        ))}
      </div>
      <h4 className="mt-6 text-sm font-bold text-slate-900">Monthly trend (demo index)</h4>
      <ul className="mt-3 space-y-3">
        {c.monthlyTrend.map((row) => (
          <li key={row.month}>
            <p className="text-xs font-semibold text-slate-500">{row.month}</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <TrendBar label="Electricity" pct={row.electricityPct} />
              <TrendBar label="Gas" pct={row.gasPct} />
            </div>
          </li>
        ))}
      </ul>
      <h4 className="mt-6 text-sm font-bold text-slate-900">Consumption alerts</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {c.alerts.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </SectionCard>
  );
}

function TrendBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{pct}% of demo baseline</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RenewalsPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard
      title="Renewals"
      description="Demo renewal rows — patterns aligned with Renewals Intelligence"
    >
      <Customer360Table
        caption="Renewals"
        headers={[
          "End date",
          "Days left",
          "Supplier",
          "Fuel",
          "Urgency",
          "Risk",
          "Action",
          "Next task",
        ]}
        rows={view.demo.renewals.map((r) => [
          r.contractEndLabel,
          String(r.daysRemaining),
          r.supplier,
          r.fuel,
          r.urgency,
          r.risk,
          r.recommendedAction,
          r.nextTask,
        ])}
      />
      <Link href="/renewals" className="mt-4 inline-block font-semibold text-emerald-600">
        Open Renewals Intelligence →
      </Link>
    </SectionCard>
  );
}

function LiveTransfersPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Live transfers" description="Demo records — telephony not connected">
      <p className="mb-4 text-sm text-slate-500">Live telephony integration: Not connected.</p>
      <Customer360Table
        caption="Live transfers"
        headers={[
          "Date/time",
          "Source",
          "Agent",
          "Outcome",
          "Wait",
          "Status",
          "Notes",
        ]}
        rows={view.demo.liveTransfers.map((t) => [
          t.transferAt,
          t.sourceChannel,
          t.agent,
          t.outcome,
          t.waitTime,
          t.status,
          t.notes,
        ])}
      />
      <Link href="/live-transfers" className="mt-4 inline-block font-semibold text-emerald-600">
        Live Transfer Command Centre →
      </Link>
    </SectionCard>
  );
}

function QuotesPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Quotes" description="Demo quote register — Not configured for live quotes">
      <Customer360Table
        caption="Quotes"
        headers={[
          "Reference",
          "Supplier",
          "Fuel",
          "Term",
          "Annual value",
          "Demo commission",
          "Status",
          "Sent",
          "Expiry",
        ]}
        rows={view.demo.quotes.map((q) => [
          q.reference,
          q.supplier,
          q.fuel,
          q.contractTerm,
          q.annualValue,
          q.demoCommission,
          q.status,
          q.sentDate,
          q.expiryDate,
        ])}
      />
    </SectionCard>
  );
}

function BillsPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Bills" description="Demo bill register — upload and validation not configured">
      <Customer360Table
        caption="Bills"
        headers={["Reference", "Supplier", "Fuel", "Period", "Amount", "Status", "Received"]}
        rows={view.demo.bills.map((bill) => [
          <>
            {bill.reference} <DemoBadge compact />
          </>,
          bill.supplier,
          bill.fuel,
          bill.periodLabel,
          bill.amount,
          bill.status,
          bill.receivedDate,
        ])}
      />
      <p className="mt-4 text-sm text-slate-500">
        Bill ingestion — Not configured. Figures are demonstration only.
      </p>
    </SectionCard>
  );
}

function CommissionPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Commission" description="Demo commission rows — not live financial data">
      <Customer360Table
        caption="Commission"
        headers={[
          "Supplier",
          "Contract",
          "Expected",
          "Paid",
          "Outstanding",
          "Status",
          "Expected pay",
          "Actual pay",
        ]}
        rows={view.demo.commissions.map((c) => [
          c.supplier,
          c.contract,
          c.expectedAmount,
          c.paidAmount,
          c.outstandingAmount,
          c.status,
          c.expectedPaymentDate,
          c.actualPaymentDate,
        ])}
      />
      <Link href="/commissions" className="mt-4 inline-block font-semibold text-emerald-600">
        Commission Intelligence →
      </Link>
    </SectionCard>
  );
}

function TasksPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Tasks" description="Live CRM tasks linked to this customer">
      <Customer360Table
        caption="Tasks"
        headers={["Title", "Type", "Due", "Time", "Priority", "Status", "Assigned"]}
        rows={view.tasks.map((t) => [
          t.title,
          t.type,
          t.dueDateLabel,
          t.dueTime,
          t.priority,
          t.status,
          t.assignedUser,
        ])}
        emptyMessage="No tasks linked — use Add task or /tasks/new."
      />
      <Link href="/tasks/new" className="mt-4 inline-block font-semibold text-emerald-600">
        Add task →
      </Link>
    </SectionCard>
  );
}

function ActivitiesPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Activities" description="Live CRM activity history for this customer">
      <Customer360Table
        caption="Activities"
        headers={["Date/time", "Type", "Title", "Details"]}
        rows={view.activities.map((activity) => [
          activity.occurredLabel,
          activity.activityType,
          activity.title,
          activity.details,
        ])}
        emptyMessage="No activities recorded — activities may be linked from lead conversion."
      />
      {view.header.sourceLeadId ? (
        <Link
          href={`/leads/${view.header.sourceLeadId}/activity/new`}
          className="mt-4 inline-block font-semibold text-emerald-600"
        >
          Add activity via source lead →
        </Link>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Add activity from customer — Not configured.</p>
      )}
    </SectionCard>
  );
}

function AppointmentsPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Appointments" description="Demo schedule — appointments route not configured">
      <Customer360Table
        caption="Appointments"
        headers={["Title", "Type", "Date", "Time", "Priority", "Status", "Assigned"]}
        rows={view.demo.appointments.map((a) => [
          a.title,
          a.type,
          a.dueDate,
          a.dueTime,
          a.priority,
          a.status,
          a.assignedUser,
        ])}
      />
      <p className="mt-4 text-sm text-slate-500">Appointments module — Not configured.</p>
    </SectionCard>
  );
}

function DocumentsPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard title="Documents" description="Demo document list — upload not configured">
      <Customer360Table
        caption="Documents"
        headers={["Name", "Type", "Uploaded", "By", "Related", "Status"]}
        rows={view.demo.documents.map((d) => [
          d.name,
          d.docType,
          d.uploadedDate,
          d.uploadedBy,
          d.relatedTo,
          d.status,
        ])}
      />
      <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
        Upload document — Not configured.
      </p>
    </SectionCard>
  );
}

function NotesPanel({ view }: { view: Customer360View }) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Broker notes"
        description="Live CRM notes field (read-only on this page)"
      >
        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {view.liveNotes?.trim() ? view.liveNotes : "No notes stored in CRM."}
        </p>
        <Link
          href={`/customers/${view.customerId}/edit`}
          className="mt-4 inline-block text-sm font-semibold text-emerald-600"
        >
          Edit broker notes in customer record →
        </Link>
      </SectionCard>
      <SectionCard title="Notes history" description="Demonstration thread only — no database writes">
        <ul className="space-y-3">
          {view.demo.noteHistoryDemo.map((note) => (
            <li key={note.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-slate-900">{note.author}</span>
                <span className="text-slate-500">{note.createdAt}</span>
                <DemoBadge compact />
              </div>
              <p className="mt-2 text-sm text-slate-700">{note.body}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

const OPPORTUNITY_PRIORITY_STYLES: Record<Opportunity360Row["priority"], string> = {
  High: "bg-red-100 text-red-900",
  Medium: "bg-amber-100 text-amber-950",
  Low: "bg-slate-100 text-slate-700",
};

function CreditStatusPanel({ view }: { view: Customer360View }) {
  const credit = view.demo.creditStatus;

  return (
    <SectionCard title="Credit status" description="Demonstration credit file — not live bureau data">
      <dl className="grid gap-4 sm:grid-cols-2">
        <OverviewItem label="Overall rating" value={credit.overallRating} />
        <OverviewItem label="Credit limit" value={credit.creditLimit} />
        <OverviewItem label="Exposure" value={credit.exposure} />
        <OverviewItem label="Payment behaviour" value={credit.paymentBehaviour} />
        <OverviewItem label="Last review" value={credit.lastReviewLabel} />
        <OverviewItem label="Next review" value={credit.nextReviewLabel} />
      </dl>
      <p className="mt-4 text-sm text-slate-600">{credit.notes}</p>
      <p className="mt-2 text-sm text-slate-500">
        Live credit integration — Not configured. <DemoBadge compact />
      </p>
    </SectionCard>
  );
}

function OpportunitiesPanel({ view }: { view: Customer360View }) {
  return (
    <SectionCard
      title="Opportunities"
      description="Customer-specific demonstration opportunities — not live pipeline data"
    >
      <ul className="space-y-3">
        {view.demo.opportunities.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{item.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${OPPORTUNITY_PRIORITY_STYLES[item.priority]}`}
              >
                {item.priority}
              </span>
              <DemoBadge compact />
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Type</dt>
                <dd className="text-slate-700">{item.type}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Status</dt>
                <dd className="text-slate-700">{item.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Estimated value</dt>
                <dd className="text-slate-700">{item.estimatedValue}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Owner</dt>
                <dd className="text-slate-700">{item.owner}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Next step:</span> {item.nextStep}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function AiAssistantPanel({ view }: { view: Customer360View }) {
  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
        role="status"
      >
        {AI_ASSISTANT_DISCONNECTED}
      </div>
      <SectionCard title="Suggested prompts" description="UI preview">
        <ul className="flex flex-wrap gap-2">
          {AI_SUGGESTED_PROMPTS.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500"
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Recommendations" description="AI Insights — demo only">
        <AiRecommendationsPanel recommendations={view.demo.aiRecommendations} />
      </SectionCard>
    </div>
  );
}
