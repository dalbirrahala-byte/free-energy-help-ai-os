import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoSupplierRecord } from "@/lib/suppliers/types";

import { DemoDataTag, SupplierRiskBadge } from "./SupplierBadges";

export function SupplierDetailWorkspace({ supplier }: { supplier: DemoSupplierRecord | null }) {
  if (!supplier) {
    return (
      <SectionCard title="Supplier detail workspace" description="Select a supplier">
        <p className="text-sm text-slate-500">Choose a scorecard or register row to view detail.</p>
      </SectionCard>
    );
  }

  const p = supplier.performance;
  const c = supplier.commission;

  return (
    <div className="space-y-6">
      <SectionCard title="Supplier overview" description={supplier.name}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Category" value={supplier.category} />
          <Detail label="Market segment" value={supplier.marketSegment} />
          <Detail label="Account owner" value={supplier.accountOwner} />
          <Detail label="Last reviewed" value={supplier.lastReviewed} />
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Fuel availability & appetite" description="Demo">
          <Detail label="Electricity" value={supplier.electricityAvailable ? "Available (demo)" : "No (demo)"} />
          <Detail label="Gas" value={supplier.gasAvailable ? "Available (demo)" : "No (demo)"} />
          <Detail label="SME / Corporate / Multi-site" value={`${supplier.smeAppetite} · ${supplier.corporateAppetite} · ${supplier.multiSiteAppetite}`} />
          <Detail label="Renewable options" value={supplier.renewableOptions} />
        </SectionCard>

        <SectionCard title="Contacts (demonstration)" description="Not real personal data">
          <Detail label="Account manager" value={supplier.service.accountManager} />
          <Detail label="Escalation" value={supplier.service.escalationContact} />
          <Detail label="Quote desk" value={supplier.service.quoteDesk} />
          <Detail label="Contract support" value={supplier.service.contractSupport} />
          <Detail label="Metering" value={supplier.service.meteringSupport} />
          <Detail label="Complaints" value={supplier.service.complaintsContact} />
        </SectionCard>
      </div>

      <SectionCard title="Contract and quote performance" description="Demo data">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Detail label="Quotes submitted" value={p.quotesSubmitted} />
          <Detail label="Quotes returned" value={p.quotesReturned} />
          <Detail label="Quotes accepted" value={p.quotesAccepted} />
          <Detail label="Contracts submitted" value={p.contractsSubmitted} />
          <Detail label="Contracts live" value={p.contractsLive} />
          <Detail label="Contracts rejected" value={p.contractsRejected} />
          <Detail label="Renewals retained" value={p.renewalsRetained} />
          <Detail label="Renewals lost" value={p.renewalsLost} />
          <Detail label="Avg contract term" value={p.avgContractTerm} />
          <Detail label="Avg annual consumption" value={p.avgAnnualConsumption} />
        </div>
      </SectionCard>

      <SectionCard title="Commission intelligence" description="Demo — patterns aligned with Commission module">
        <div className="mb-3 flex items-center gap-2">
          <DemoDataTag />
          <SupplierRiskBadge level={c.commissionRiskLevel} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Expected commission" value={c.expectedCommission} />
          <Detail label="Paid commission" value={c.paidCommission} />
          <Detail label="Outstanding" value={c.outstandingCommission} />
          <Detail label="Average payment days" value={c.avgPaymentDays} />
          <Detail label="Late payments" value={c.latePayments} />
          <Detail label="Disputed commission" value={c.disputedCommission} />
          <Detail label="Reconciliation required" value={c.reconciliationRequired} />
          <Detail label="Commission risk" value={c.commissionRiskLevel} />
        </div>
      </SectionCard>

      <SectionCard title="Supplier service panel" description="Demo service metrics">
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Average response time" value={supplier.service.avgResponseTime} />
          <Detail label="Last service issue" value={supplier.service.lastServiceIssue} />
          <Detail label="Open service cases" value={supplier.service.openServiceCases} />
        </div>
      </SectionCard>

      <SectionCard title="Notes and review history" description="Internal demo records">
        <Detail label="Internal notes" value={supplier.notes.internalNotes} />
        <Detail label="Last review / by / next" value={`${supplier.notes.lastReview} · ${supplier.notes.reviewedBy} · Next ${supplier.notes.nextReview}`} />
        <Detail label="Service concerns" value={supplier.notes.serviceConcerns} />
        <Detail label="Pricing concerns" value={supplier.notes.pricingConcerns} />
        <Detail label="Commission concerns" value={supplier.notes.commissionConcerns} />
        <Detail label="Appetite changes" value={supplier.notes.appetiteChanges} />
        <Detail label="Recommended action" value={supplier.notes.recommendedAction} />
      </SectionCard>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}
