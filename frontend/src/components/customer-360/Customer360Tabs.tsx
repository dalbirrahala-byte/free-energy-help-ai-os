"use client";

import type { Customer360Tab } from "@/lib/customer-360/types";
import { CUSTOMER_360_TABS } from "@/lib/customer-360/constants";

type Customer360TabsProps = {
  activeTab: Customer360Tab;
  onChange: (tab: Customer360Tab) => void;
  tablistId?: string;
};

export function Customer360Tabs({
  activeTab,
  onChange,
  tablistId = "customer-360-tabs",
}: Customer360TabsProps) {
  return (
    <nav aria-label="Customer 360 sections" className="overflow-x-auto">
      <ul
        id={tablistId}
        role="tablist"
        className="flex min-w-max gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        {CUSTOMER_360_TABS.map((item) => {
          const selected = activeTab === item;
          const tabId = `tab-${item.replace(/\s+/g, "-").toLowerCase()}`;

          return (
            <li key={item} role="presentation">
              <button
                type="button"
                role="tab"
                id={tabId}
                aria-selected={selected}
                aria-controls={`panel-${tabId}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(item)}
                onKeyDown={(event) => {
                  const index = CUSTOMER_360_TABS.indexOf(item);
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    const next = CUSTOMER_360_TABS[(index + 1) % CUSTOMER_360_TABS.length];
                    onChange(next);
                  }
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    const prev =
                      CUSTOMER_360_TABS[
                        (index - 1 + CUSTOMER_360_TABS.length) % CUSTOMER_360_TABS.length
                      ];
                    onChange(prev);
                  }
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  selected ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function customer360PanelId(tab: Customer360Tab): string {
  return `panel-tab-${tab.replace(/\s+/g, "-").toLowerCase()}`;
}
