"use client";

import { useState } from "react";

import {
  DEMO_360_BANNER_DETAIL,
  DEMO_360_BANNER_TITLE,
} from "@/lib/customer-360/constants";
import type { Customer360Tab, Customer360View } from "@/lib/customer-360/types";

import { Customer360Alerts } from "./Customer360Alerts";
import { Customer360Header } from "./Customer360Header";
import { Customer360SummaryCards } from "./Customer360SummaryCards";
import { Customer360TabPanels } from "./Customer360TabPanels";
import { Customer360Tabs } from "./Customer360Tabs";
import { RenewalActionWorkspace } from "./RenewalActionWorkspace";

type Customer360WorkspaceProps = {
  view: Customer360View;
};

export function Customer360Workspace({ view }: Customer360WorkspaceProps) {
  const [tab, setTab] = useState<Customer360Tab>("Overview");

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">{DEMO_360_BANNER_TITLE}</p>
        <p className="mt-1">{DEMO_360_BANNER_DETAIL}</p>
      </div>

      <Customer360Header
        customerId={view.customerId}
        header={view.header}
        onOpenAiAssistant={() => setTab("AI Assistant")}
      />

      <RenewalActionWorkspace data={view.renewalAction} />

      <Customer360SummaryCards summary={view.summary} />

      <Customer360Alerts alerts={view.alerts} />

      <Customer360Tabs activeTab={tab} onChange={setTab} />

      <Customer360TabPanels tab={tab} view={view} />
    </div>
  );
}
