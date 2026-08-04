import type { ServiceStatusInfo } from "@/lib/ai-control-centre/types";

import { AiStatusBadge } from "./AiStatusBadge";
import { SectionCard } from "./SectionCard";

type AiControlCentreSectionProps = {
  services: ServiceStatusInfo[];
};

export function AiControlCentreSection({ services }: AiControlCentreSectionProps) {
  return (
    <SectionCard
      title="AI Control Centre"
      description="Live status of connected AI and automation services"
    >
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <li
            key={service.id}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{service.name}</p>
              <AiStatusBadge status={service.status} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{service.detail}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
