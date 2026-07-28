type RecommendationBadgeProps = {
  recommended: boolean;
};

export function RecommendationBadge({ recommended }: RecommendationBadgeProps) {
  if (!recommended) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
      Recommended
    </span>
  );
}
