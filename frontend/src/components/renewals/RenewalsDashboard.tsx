"use client";

import { useMemo, useState } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import {
  DEMO_AS_OF_DATE,
  DEMO_DATA_LABEL,
  formatGbp,
  getDemoPipelineCounts,
} from "@/lib/renewals/demo-data";
import { filterDemoRenewals, uniqueSuppliers } from "@/lib/renewals/filters";
import { buildRenewalCase } from "@/lib/renewals/case-engine";
import type { RenewalCase, RenewalCaseStore } from "@/lib/renewals/case-types";
import type { DemoRenewalRecord, RenewalFilterState } from "@/lib/renewals/types";

import { RenewalPipelineSummary } from "./RenewalPipelineSummary";
import { RenewalsTable } from "./RenewalsTable";
import { RenewalsToolbar } from "./RenewalsToolbar";
import { StartRenewalModal } from "./StartRenewalModal";

type RenewalsDashboardProps = {
  records: DemoRenewalRecord[];
};

const INITIAL_FILTERS: RenewalFilterState = {
  query: "",
  pipelineWindow: "all",
  urgency: "all",
  riskLevel: "all",
  supplier: "all",
};

const INITIAL_CASE_STORE: RenewalCaseStore = {
  casesByRegisterId: {},
  nextSequence: 1,
};

export function RenewalsDashboard({ records }: RenewalsDashboardProps) {
  const [filters, setFilters] = useState<RenewalFilterState>(INITIAL_FILTERS);
  const [renewalInProgress, setRenewalInProgress] = useState<DemoRenewalRecord | null>(null);
  const [caseStore, setCaseStore] = useState<RenewalCaseStore>(INITIAL_CASE_STORE);

  const suppliers = useMemo(() => uniqueSuppliers(records), [records]);

  const filtered = useMemo(
    () => filterDemoRenewals(records, filters),
    [records, filters],
  );

  const pipelineCounts = useMemo(
    () => getDemoPipelineCounts(filtered),
    [filtered],
  );

  const demoEacvTotal = useMemo(
    () => filtered.reduce((sum, row) => sum + row.estimatedAnnualContractValueGbp, 0),
    [filtered],
  );

  const demoCommissionTotal = useMemo(
    () => filtered.reduce((sum, row) => sum + row.estimatedBrokerCommissionGbp, 0),
    [filtered],
  );

  const activeCase =
    renewalInProgress && caseStore.casesByRegisterId[renewalInProgress.id]
      ? caseStore.casesByRegisterId[renewalInProgress.id]
      : null;

  function handleCreateCase() {
    if (!renewalInProgress) {
      return;
    }

    setCaseStore((prev) => {
      if (prev.casesByRegisterId[renewalInProgress.id]) {
        return prev;
      }

      const newCase = buildRenewalCase(renewalInProgress, prev.nextSequence);
      return {
        casesByRegisterId: {
          ...prev.casesByRegisterId,
          [renewalInProgress.id]: newCase,
        },
        nextSequence: prev.nextSequence + 1,
      };
    });
  }

  function handleUpdateCase(next: RenewalCase) {
    if (!renewalInProgress) {
      return;
    }

    setCaseStore((prev) => ({
      ...prev,
      casesByRegisterId: {
        ...prev.casesByRegisterId,
        [renewalInProgress.id]: next,
      },
    }));
  }

  const openCaseCount = Object.keys(caseStore.casesByRegisterId).length;

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">Demonstration mode</p>
        <p className="mt-1">{DEMO_DATA_LABEL}</p>
        <p className="mt-1 text-xs text-amber-900/80">
          Pipeline buckets calculated as of {DEMO_AS_OF_DATE} (static demo reference
          date).
          {openCaseCount > 0 && (
            <span className="block mt-1">
              {openCaseCount} renewal case(s) open in this session (local state only).
            </span>
          )}
        </p>
      </div>

      <RenewalPipelineSummary
        counts={pipelineCounts}
        demoEacvTotalLabel={formatGbp(demoEacvTotal)}
        demoCommissionTotalLabel={formatGbp(demoCommissionTotal)}
      />

      <RenewalsToolbar
        filters={filters}
        suppliers={suppliers}
        resultCount={filtered.length}
        onChange={setFilters}
      />

      <SectionCard
        title="Renewals intelligence register"
        description="Colour-coded urgency, risk, and recommended actions (demo records)"
        action={{ label: "Mission Control", href: "/" }}
      >
        <RenewalsTable
          records={filtered}
          onStartRenewal={(record) => setRenewalInProgress(record)}
        />
      </SectionCard>

      {renewalInProgress && (
        <StartRenewalModal
          record={renewalInProgress}
          existingCase={activeCase}
          onCreateCase={handleCreateCase}
          onUpdateCase={handleUpdateCase}
          onClose={() => setRenewalInProgress(null)}
        />
      )}
    </div>
  );
}
