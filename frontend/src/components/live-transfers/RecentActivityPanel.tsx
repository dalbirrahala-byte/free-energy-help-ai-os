import { formatActivityTime } from "@/lib/live-transfers/demo-data";
import type { ActivityEvent } from "@/lib/live-transfers/types";

import { TransferStatusBadge } from "./TransferStatusBadge";

export function RecentActivityPanel({ events }: { events: ActivityEvent[] }) {
  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="recent-activity-heading" className="text-lg font-bold text-slate-900">
        Recent transfer activity
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-2 py-2 font-semibold">Timestamp</th>
              <th className="px-2 py-2 font-semibold">Business</th>
              <th className="px-2 py-2 font-semibold">Agent</th>
              <th className="px-2 py-2 font-semibold">Event</th>
              <th className="px-2 py-2 font-semibold">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-slate-100">
                <td className="px-2 py-2 whitespace-nowrap">
                  {formatActivityTime(event.timestamp)} demo
                </td>
                <td className="px-2 py-2">{event.business}</td>
                <td className="px-2 py-2">{event.agent}</td>
                <td className="px-2 py-2">{event.event}</td>
                <td className="px-2 py-2">
                  <TransferStatusBadge status={event.outcome} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
