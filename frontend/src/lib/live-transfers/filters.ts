import type { DemoLiveTransfer, LiveTransferFilterState, UrgencyGroup } from "./types";

export function waitingBucket(seconds: number): UrgencyGroup["bucket"] {
  if (seconds < 30) {
    return "under_30s";
  }

  if (seconds <= 60) {
    return "30_60s";
  }

  if (seconds <= 120) {
    return "1_2m";
  }

  return "over_2m";
}

export function filterTransfers(
  transfers: DemoLiveTransfer[],
  filters: LiveTransferFilterState,
): DemoLiveTransfer[] {
  const q = filters.query.trim().toLowerCase();

  return transfers.filter((transfer) => {
    if (filters.status !== "all" && transfer.status !== filters.status) {
      return false;
    }

    if (filters.priority !== "all" && transfer.priority !== filters.priority) {
      return false;
    }

    if (filters.fuelType !== "all" && transfer.fuelType !== filters.fuelType) {
      return false;
    }

    if (
      filters.assignedAgent !== "all" &&
      (transfer.assignedAgent ?? "Unassigned") !== filters.assignedAgent
    ) {
      return false;
    }

    if (filters.waitingBucket !== "all") {
      const bucket = waitingBucket(transfer.timeWaitingSeconds);
      if (bucket !== filters.waitingBucket) {
        return false;
      }
    }

    if (q) {
      const haystack = [
        transfer.businessName,
        transfer.contactName,
        transfer.telephone,
        transfer.postcode,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

export function uniqueAgents(transfers: DemoLiveTransfer[]): string[] {
  const set = new Set<string>();
  for (const transfer of transfers) {
    set.add(transfer.assignedAgent ?? "Unassigned");
  }

  return [...set].sort();
}
