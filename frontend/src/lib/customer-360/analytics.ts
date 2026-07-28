export function formatUkDate(date: string | null | undefined): string {
  if (!date) {
    return "Not set";
  }

  const iso = date.length <= 10 ? `${date}T00:00:00` : date;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatUkDateTime(date: string, time?: string | null): string {
  const dateLabel = formatUkDate(date);
  if (!time) {
    return dateLabel;
  }

  return `${dateLabel} ${time.slice(0, 5)}`;
}

export function daysUntil(date: string | null): number | null {
  if (!date) {
    return null;
  }

  const end = new Date(`${date.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function renewalCountdownLabel(days: number | null): string {
  if (days === null) {
    return "Not set";
  }

  if (days < 0) {
    return `Expired ${Math.abs(days)} days ago`;
  }

  if (days === 0) {
    return "Expires today";
  }

  return `${days} days remaining`;
}

export function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "Not provided";
}

export function countOpenTasks(
  tasks: { status: string | null; due_date: string | null }[],
): number {
  const open = tasks.filter(
    (t) => (t.status ?? "Open").toLowerCase() !== "completed" && (t.status ?? "").toLowerCase() !== "done",
  );

  return open.length;
}

export function countRenewalsDueWithinDays(
  contractEnds: (string | null)[],
  withinDays: number,
): number {
  return contractEnds.filter((end) => {
    const days = daysUntil(end);
    return days !== null && days >= 0 && days <= withinDays;
  }).length;
}

export function buildRenewalsDueLabel(
  contractEnds: (string | null)[],
  demoRenewalCount: number,
): string {
  const live = countRenewalsDueWithinDays(contractEnds, 90);
  if (live > 0 && demoRenewalCount > 0) {
    return `${live} live site(s) · ${demoRenewalCount} demo register`;
  }

  if (live > 0) {
    return String(live);
  }

  if (demoRenewalCount > 0) {
    return `${demoRenewalCount} (demo register)`;
  }

  return "0";
}
