"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { FEH_ASSISTANT_VOICE_PROFILE } from "@/lib/ai-assistant/voice-profile";
import { POLYAI_CRM_PROVIDER } from "@/lib/voice/polyai-provider";

export function VoiceIdentityPanel() {
  const voice = FEH_ASSISTANT_VOICE_PROFILE;
  const provider = POLYAI_CRM_PROVIDER;

  return (
    <SectionCard
      title="FEH Assistant Voice"
      description="PolyAI selected for the FEH business-energy voice experience"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Selected provider</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{voice.provider}</p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Product</dt>
              <dd>{voice.providerProduct}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Language</dt>
              <dd>{voice.locale}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Voice</dt>
              <dd>{voice.selectedVoiceName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Style</dt>
              <dd>{voice.selectedVoiceStyle}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs font-medium text-emerald-800">{voice.providerSelectionStatus}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CRM connection</p>
          <p className="mt-1 font-bold text-slate-900">{provider.health}</p>
          <p className="mt-1 text-sm text-slate-600">{voice.runtimeStatus}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>Call summary → CRM activity contract prepared</li>
            <li>Callback request → follow-up contract prepared</li>
            <li>Human transfer → {voice.transferNumber}</li>
            <li>Provider execution remains disabled until authenticated</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer opening</p>
        <p className="mt-2 text-sm text-slate-800">{voice.openingGreeting}</p>
        <p className="mt-3 text-xs text-slate-500">
          PolyAI is selected, but the CRM will continue to display “Not configured” until production credentials,
          webhook verification and the live transfer test are complete.
        </p>
      </div>
    </SectionCard>
  );
}
