import type { DemoLiveTransfer, DemoTransferAgent, UrgencyGroup } from "./types";
import { waitingBucket } from "./filters";

export function buildUrgencyGroups(transfers: DemoLiveTransfer[]): UrgencyGroup[] {
  const active = transfers.filter(
    (t) => t.status === "Waiting" || t.status === "Calling",
  );

  const buckets: UrgencyGroup[] = [
    { bucket: "under_30s", label: "Under 30 seconds", count: 0, heat: "green" },
    { bucket: "30_60s", label: "30–60 seconds", count: 0, heat: "amber" },
    { bucket: "1_2m", label: "1–2 minutes", count: 0, heat: "amber" },
    { bucket: "over_2m", label: "Over 2 minutes", count: 0, heat: "red" },
  ];

  for (const transfer of active) {
    const bucket = waitingBucket(transfer.timeWaitingSeconds);
    const group = buckets.find((g) => g.bucket === bucket);
    if (group) {
      group.count += 1;
    }
  }

  return buckets;
}

export function buildHourlyTransfers() {
  return [
    { label: "09:00", value: 3 },
    { label: "10:00", value: 5 },
    { label: "11:00", value: 7 },
    { label: "12:00", value: 4 },
    { label: "13:00", value: 6 },
    { label: "14:00", value: 8 },
  ];
}

export function buildConversionByAgent(agents: DemoTransferAgent[]) {
  return agents.map((agent) => ({
    label: agent.name.split(" ")[0] ?? agent.name,
    value: agent.conversionsToday,
  }));
}

export function buildTransferOutcomes(transfers: DemoLiveTransfer[]) {
  const counts = new Map<string, number>();
  for (const transfer of transfers) {
    counts.set(transfer.status, (counts.get(transfer.status) ?? 0) + 1);
  }

  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

export function buildWaitTimeTrend() {
  return [
    { label: "Mon", value: 78 },
    { label: "Tue", value: 65 },
    { label: "Wed", value: 54 },
    { label: "Thu", value: 48 },
    { label: "Fri", value: 42 },
  ];
}

export function buildRevenueTrend() {
  return [
    { label: "Mon", value: 4200 },
    { label: "Tue", value: 5100 },
    { label: "Wed", value: 4800 },
    { label: "Thu", value: 6200 },
    { label: "Fri", value: 6840 },
  ];
}
