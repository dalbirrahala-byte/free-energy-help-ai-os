import { notFound } from "next/navigation";

// These form actions and their audit records still require numeric IDs.
export function requireNumericRouteId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== raw) {
    notFound();
  }
  return id;
}
