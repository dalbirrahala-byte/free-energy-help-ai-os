import { FEH_ASSISTANT_VOICE_PROFILE } from "@/lib/ai-assistant/voice-profile";

export const POLYAI_CRM_PROVIDER = {
  key: "polyai",
  displayName: "PolyAI Agent Studio",
  selected: true,
  health: "Not configured",
  credentialsConfigured: false,
  webhookConfigured: false,
  liveTransferConfigured: false,
  crmWriteEnabled: false,
  profile: FEH_ASSISTANT_VOICE_PROFILE,
  requiredBeforeLive: [
    "PolyAI production credentials or signed webhook details",
    "Verified inbound event authenticity",
    "CRM tool gateway authentication",
    "Conversation and callback persistence test",
    "Live transfer test to 01332 605506",
    "Voice Quality Gate approval",
  ],
} as const;

export type PolyAiCrmProvider = typeof POLYAI_CRM_PROVIDER;
