// Shared date utilities for the intelligence layer. Each function here was
// previously duplicated verbatim across 3-4 files (lib/intelligence,
// lib/commercial-energy-intelligence). Logic is unchanged from every prior
// copy — this is a pure extraction, not a rewrite.
//
// lib/renewal-intelligence (V1) is deliberately NOT rewired to use these —
// it keeps its own local copies, per the standing "V1 stays exactly as
// shipped" rule from earlier gates.

/** Whole days between `today` and a YYYY-MM-DD date key. Null for missing or invalid dates — fails safe. */
export function daysUntil(dateKey: string | null, today: Date): number | null {
  if (!dateKey) {
    return null;
  }

  const target = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Formats a Date as a YYYY-MM-DD key using local calendar fields (not UTC). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateEnGB(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** The most recent (lexicographically greatest) YYYY-MM-DD key, ignoring nulls. Null if none are present. */
export function mostRecentDate(dates: Array<string | null>): string | null {
  const valid = dates.filter((date): date is string => Boolean(date));
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((latest, current) => (current > latest ? current : latest));
}
