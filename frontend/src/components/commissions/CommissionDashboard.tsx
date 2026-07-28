"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { buildCommissionAlerts } from "@/lib/commissions/alerts";
import {
  availableMonthKeys,
  uniqueFilterValues,
} from "@/lib/commissions/demo-data";
import { filterCommissionRecords } from "@/lib/commissions/filters";
import type { CommissionFilterState, DemoCommissionRecord } from "@/lib/commissions/types";

import { CommissionAlertsPanel } from "./CommissionAlertsPanel";
import { CommissionFilters } from "./CommissionFilters";
import { CommissionIntelligenceCentre } from "./CommissionIntelligenceCentre";
import { CommissionRecordsTable } from "./CommissionRecordsTable";
import { CommissionReportingPanel } from "./CommissionReportingPanel";

type CommissionDashboardProps = {
  records: DemoCommissionRecord[];
};

const INITIAL_FILTERS: CommissionFilterState = {
  supplier: "all",
  customer: "all",
  status: "all",
  month: "all",
  fuelType: "all",
  accountManager: "all",
};

export function CommissionDashboard({ records }: CommissionDashboardProps) {
  const [filters, setFilters] = useState<CommissionFilterState>(INITIAL_FILTERS);

  const filterOptions = useMemo(
    () => ({
      suppliers: uniqueFilterValues(records, "supplier"),
      customers: uniqueFilterValues(records, "customer"),
      fuelTypes: uniqueFilterValues(records, "fuelType"),
      accountManagers: uniqueFilterValues(records, "accountManager"),
      months: availableMonthKeys(records),
    }),
    [records],
  );

  const filtered = useMemo(
    () => filterCommissionRecords(records, filters),
    [records, filters],
  );

  const alerts = useMemo(() => buildCommissionAlerts(filtered), [filtered]);

  return (
    <div className="space-y-10">
      <CommissionIntelligenceCentre records={records} />

      <div className="border-t border-slate-200 pt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Commission register (007A)</h2>
        <CommissionFilters
          filters={filters}
          suppliers={filterOptions.suppliers}
          customers={filterOptions.customers}
          months={filterOptions.months}
          fuelTypes={filterOptions.fuelTypes}
          accountManagers={filterOptions.accountManagers}
          resultCount={filtered.length}
          onChange={setFilters}
        />

        <div className="mt-6 space-y-6">
          <CommissionAlertsPanel alerts={alerts} />
          <CommissionReportingPanel records={filtered} filterMonth={filters.month} />
          <SectionCard
            title="Commission records"
            description="Demo commission register — filterable detail view"
            action={{ label: "Mission Control", href: "/" }}
          >
            <CommissionRecordsTable records={filtered} />
          </SectionCard>
        </div>
      </div>

      <nav aria-label="Related modules" className="flex flex-wrap gap-3 text-sm">
        <Link href="/renewals" className="font-semibold text-emerald-600 hover:text-emerald-700">
          Renewals Intelligence
        </Link>
        <Link href="/" className="font-semibold text-emerald-600 hover:text-emerald-700">
          Mission Control
        </Link>
      </nav>
    </div>
  );
}
