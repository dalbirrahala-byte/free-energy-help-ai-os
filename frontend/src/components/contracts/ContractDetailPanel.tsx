import Link from "next/link";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { formatUkDate } from "@/lib/contracts/analytics";
import type { DemoContractRecord } from "@/lib/contracts/types";

import { ContractRiskBadge, ContractStatusBadge } from "./ContractBadges";

type ContractDetailPanelProps = {
  record: DemoContractRecord | null;
};

export function ContractDetailPanel({ record }: ContractDetailPanelProps) {
  if (!record) {
    return (
      <SectionCard title="Contract detail" description="Select a contract from the register">
        <p className="text-sm text-slate-500">No contract selected — click View on a row.</p>
      </SectionCard>
    );
  }

  const d = record.detail;

  return (
    <SectionCard
      title="Contract detail"
      description={`${record.customer} — demonstration record`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <DetailBlock title="Customer & site">
          <DetailRow label="Customer" value={record.customer} />
          <DetailRow label="Site" value={record.site} />
          <DetailRow label="Region" value={record.region} />
          <DetailRow label="Account manager" value={record.accountManager} />
        </DetailBlock>
        <DetailBlock title="Supply">
          <DetailRow label="Supplier" value={record.supplier} />
          <DetailRow label="Fuel" value={record.fuelType} />
          <DetailRow label="MPAN / MPRN" value={d.mpanMprn} />
          <DetailRow label="Meter serial" value={d.meterSerial} />
        </DetailBlock>
        <DetailBlock title="Contract terms">
          <DetailRow label="Start" value={formatUkDate(record.startDate)} />
          <DetailRow label="End" value={formatUkDate(record.endDate)} />
          <DetailRow label="Length" value={d.contractLength} />
          <DetailRow label="Type" value={record.contractType} />
          <div className="mt-2 flex flex-wrap gap-2">
            <ContractStatusBadge status={record.status} />
            <ContractRiskBadge level={record.riskLevel} />
          </div>
        </DetailBlock>
        <DetailBlock title="Commercial (demo)">
          <DetailRow label="Annual consumption" value={record.annualConsumption} />
          <DetailRow label="Unit rate" value={d.unitRate} />
          <DetailRow label="Standing charge" value={d.standingCharge} />
          <DetailRow label="Est. annual spend" value={record.estimatedAnnualSpend} />
          <DetailRow label="Demo commission" value={record.demoCommission} />
        </DetailBlock>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DetailBlock title="Notes & history">
          <DetailRow label="Contract notes" value={d.contractNotes} />
          <DetailRow label="Previous supplier" value={d.previousSupplier} />
          <DetailRow label="Previous contract" value={d.previousContract} />
          <p className="mt-2 text-xs font-semibold uppercase text-slate-400">Renewal history</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
            {d.renewalHistory.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </DetailBlock>
        <DetailBlock title="Documents">
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            Contract documents — Not configured (demo placeholder)
          </p>
          {record.customerId && (
            <Link
              href={`/customers/${record.customerId}`}
              className="mt-3 inline-block text-sm font-semibold text-emerald-600"
            >
              Open Customer 360 →
            </Link>
          )}
        </DetailBlock>
      </div>
    </SectionCard>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}
