import Link from "next/link";

import { NOT_CONNECTED } from "@/lib/live-transfers/constants";
import {
  formatDisplayDate,
  formatWaitTime,
} from "@/lib/live-transfers/demo-data";
import type { DemoLiveTransfer } from "@/lib/live-transfers/types";

import { PriorityBadge } from "./PriorityBadge";
import { TransferStatusBadge } from "./TransferStatusBadge";

export function LiveTransferQueueTable({ items }: { items: DemoLiveTransfer[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Live transfer queue</h2>
        <p className="mt-4 text-sm text-slate-500">No transfers found.</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="live-queue-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="live-queue-heading" className="text-lg font-bold text-slate-900">
        Live transfer queue
      </h2>
      <p className="mt-1 text-sm text-slate-500">Demo data — telephony Not connected.</p>

      <div className="mt-4 hidden overflow-x-auto 2xl:block">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 uppercase text-slate-500">
              {[
                "Business",
                "Contact",
                "Telephone",
                "Postcode",
                "Type",
                "Fuel",
                "Est. elec",
                "Est. gas",
                "Supplier",
                "Contract end",
                "Priority",
                "Status",
                "Agent",
                "Waiting",
                "Controls",
              ].map((header) => (
                <th key={header} scope="col" className="px-2 py-2 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2 font-medium">{row.businessName}</td>
                <td className="px-2 py-2">{row.contactName}</td>
                <td className="px-2 py-2 whitespace-nowrap">{row.telephone}</td>
                <td className="px-2 py-2">{row.postcode}</td>
                <td className="px-2 py-2">{row.businessType}</td>
                <td className="px-2 py-2">{row.fuelType}</td>
                <td className="px-2 py-2">
                  {row.estimatedElectricityKwh?.toLocaleString() ?? "—"}
                </td>
                <td className="px-2 py-2">{row.estimatedGasKwh?.toLocaleString() ?? "—"}</td>
                <td className="px-2 py-2">{row.currentSupplier}</td>
                <td className="px-2 py-2">{formatDisplayDate(row.contractEndDate)}</td>
                <td className="px-2 py-2">
                  <PriorityBadge priority={row.priority} />
                </td>
                <td className="px-2 py-2">
                  <TransferStatusBadge status={row.status} />
                </td>
                <td className="px-2 py-2">{row.assignedAgent ?? "Unassigned"}</td>
                <td className="px-2 py-2">{formatWaitTime(row.timeWaitingSeconds)}</td>
                <td className="px-2 py-2">
                  <QueueControls leadId={row.leadId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-3 2xl:hidden">
        {items.map((row) => (
          <li key={row.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-bold">{row.businessName}</p>
              <TransferStatusBadge status={row.status} />
            </div>
            <p>
              {row.contactName} · {row.telephone} · {row.postcode}
            </p>
            <p className="mt-1 text-slate-600">
              {row.fuelType} · {row.currentSupplier}
            </p>
            <QueueControls leadId={row.leadId} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function QueueControls({ leadId }: { leadId: number | null }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {["Accept", "Transfer", "Hold", "Reject"].map((label) => (
        <button
          key={label}
          type="button"
          disabled
          title={NOT_CONNECTED}
          className="cursor-not-allowed rounded border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-400"
        >
          {label} — Not connected
        </button>
      ))}
      {leadId ? (
        <Link
          href={`/leads/${leadId}`}
          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800"
        >
          Open lead
        </Link>
      ) : (
        <Link
          href="/leads/new"
          className="rounded border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600"
        >
          Open lead (new)
        </Link>
      )}
    </div>
  );
}
