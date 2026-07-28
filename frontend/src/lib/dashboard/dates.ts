const UK = "en-GB";

export function startOfTodayLocal(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMonthLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function addDaysLocal(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDisplayDate(date: string | null): string {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(UK, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatDateTimeLabel(
  date: string | null,
  time: string | null,
): string {
  if (!date && !time) {
    return "Not set";
  }

  const datePart = date ? formatDisplayDate(date) : "No date";
  const timePart = time ? time.slice(0, 5) : "";

  return timePart ? `${datePart} · ${timePart}` : datePart;
}

export const FOLLOW_UP_DAYS = 14;
export const RENEWAL_WARNING_DAYS = 90;

export const PIPELINE_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Quote Sent",
  "Negotiation",
  "Won",
  "Lost",
] as const;
