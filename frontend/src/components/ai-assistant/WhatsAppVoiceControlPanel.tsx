"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { FEH_WHATSAPP_VOICE_CONTROL } from "@/lib/whatsapp-inbound/voice-control";

export function WhatsAppVoiceControlPanel() {
  const control = FEH_WHATSAPP_VOICE_CONTROL;

  return (
    <SectionCard
      title="WhatsApp Voice Control"
      description="Same FEH corporate voice, with controlled draft and voice-note preparation"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Configured voice</p>
          <p className="mt-1 font-bold text-slate-900">{control.voice.label}</p>
          <p className="mt-1 text-sm text-slate-600">
            {control.voice.locale} · speed {control.voice.speed} · same approved FEH corporate video voice
          </p>
          <p className="mt-3 text-sm text-slate-700">{control.status}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Safety state</p>
          <p className="mt-1 text-sm font-semibold text-amber-950">Human approval required before any outbound WhatsApp send.</p>
          <p className="mt-2 text-sm text-amber-900">
            Provider execution and autonomous replies remain locked until the existing consent,
            suppression and execution-authorisation gates are satisfied.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Voice commands being prepared</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {control.supportedCommands.map((command) => (
              <li key={command} className="rounded-lg bg-slate-50 px-3 py-2">
                “{command}”
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Blocked by design</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {control.blockedCommands.map((command) => <li key={command}>{command}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Planned interaction</p>
        <p className="mt-1 text-sm text-slate-600">
          You speak a command in the CRM → the CRM prepares the WhatsApp text or FEH-voice note →
          you review it → the existing execution controls decide whether Send can be enabled.
        </p>
      </div>
    </SectionCard>
  );
}
