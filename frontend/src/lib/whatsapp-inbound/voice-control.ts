import { FEH_ASSISTANT_VOICE_PROFILE } from "@/lib/ai-assistant/voice-profile";

export const FEH_WHATSAPP_VOICE_CONTROL = {
  channel: "WHATSAPP",
  voice: FEH_ASSISTANT_VOICE_PROFILE,
  status: "Configured for draft control — provider execution remains locked",
  supportedCommands: [
    "Draft a WhatsApp reply",
    "Prepare a WhatsApp voice note",
    "Summarise the latest WhatsApp enquiry",
    "Create a follow-up task from this WhatsApp conversation",
  ],
  blockedCommands: [
    "Send without human approval",
    "Contact a suppressed or non-consenting recipient",
    "Start autonomous WhatsApp outreach",
    "Place a WhatsApp call",
  ],
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
  humanApprovalRequired: true,
} as const;

export type FehWhatsAppVoiceControl = typeof FEH_WHATSAPP_VOICE_CONTROL;
