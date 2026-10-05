"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { FEH_ASSISTANT_VOICE_PROFILE } from "@/lib/ai-assistant/voice-profile";

export function VoiceIdentityPanel() {
  const voice = FEH_ASSISTANT_VOICE_PROFILE;

  return (
    <SectionCard
      title="FEH Assistant Voice"
      description="Corporate voice identity locked to the approved FEH video voice"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Voice identity</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{voice.label}</p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Provider</dt>
              <dd>{voice.provider}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Locale</dt>
              <dd>{voice.locale}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Speed</dt>
              <dd>{voice.speed}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Pitch</dt>
              <dd>{voice.pitch}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference asset</p>
          <p className="mt-1 font-bold text-slate-900">{voice.referenceVideo.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            This is the same voice profile used in the approved 43-second FEH corporate introduction video.
          </p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {voice.runtimeStatus}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opening disclosure</p>
        <p className="mt-2 text-sm text-slate-800">{voice.disclosure}</p>
        <p className="mt-2 text-xs text-slate-500">
          Live playback remains disabled until the secure server-side voice provider gateway is connected and passes the FEH Voice Quality Gate.
        </p>
      </div>
    </SectionCard>
  );
}
