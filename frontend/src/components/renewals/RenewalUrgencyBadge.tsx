import type { RenewalUrgencyBand } from "@/lib/renewals/types";
import { URGENCY_LABELS } from "@/lib/renewals/urgency";

const URGENCY_STYLES: Record<
  RenewalUrgencyBand,
  { badge: string; dot: string; label: string }
> = {
  critical: {
    badge: "bg-red-100 text-red-900 border-red-200",
    dot: "bg-red-500",
    label: URGENCY_LABELS.critical,
  },
  high: {
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
    label: URGENCY_LABELS.high,
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-900 border-yellow-200",
    dot: "bg-yellow-500",
    label: URGENCY_LABELS.medium,
  },
  planned: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    label: URGENCY_LABELS.planned,
  },
};

type RenewalUrgencyBadgeProps = {
  band: RenewalUrgencyBand;
  daysUntilEnd?: number;
};

export function RenewalUrgencyBadge({ band, daysUntilEnd }: RenewalUrgencyBadgeProps) {
  const styles = URGENCY_STYLES[band];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}
      aria-label={`Renewal urgency: ${styles.label}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`}
        aria-hidden
      />
      {styles.label}
      {typeof daysUntilEnd === "number" && (
        <span className="font-normal opacity-80">({daysUntilEnd}d)</span>
      )}
    </span>
  );
}

export function renewalHealthTone(score: number): string {
  if (score >= 75) {
    return "text-emerald-700";
  }

  if (score >= 50) {
    return "text-amber-700";
  }

  return "text-red-700";
}

export function riskLevelTone(level: string): string {
  if (level === "High") {
    return "text-red-700 bg-red-50";
  }

  if (level === "Medium") {
    return "text-amber-800 bg-amber-50";
  }

  return "text-emerald-800 bg-emerald-50";
}
