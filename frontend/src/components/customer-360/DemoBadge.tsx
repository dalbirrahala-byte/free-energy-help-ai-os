type DemoBadgeProps = {
  compact?: boolean;
};

export function DemoBadge({ compact }: DemoBadgeProps) {
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
      {compact ? "Demo" : "Demo data"}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
      Live CRM
    </span>
  );
}
