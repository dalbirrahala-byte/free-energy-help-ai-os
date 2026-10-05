export type PolyAiCallOutcome =
  | "resolved"
  | "callback_requested"
  | "transfer_requested"
  | "transferred"
  | "abandoned"
  | "unknown";

export type PolyAiCrmCallEnvelope = Readonly<{
  provider: "polyai";
  providerConversationId: string;
  startedAt: string;
  endedAt?: string | null;
  callerPhone?: string | null;
  contactName?: string | null;
  businessName?: string | null;
  summary?: string | null;
  transcriptReference?: string | null;
  enquiryType?: string | null;
  outcome: PolyAiCallOutcome;
  callbackRequested: boolean;
  callbackPhone?: string | null;
  transferRequested: boolean;
}>;

export type PolyAiCrmWritePlan = Readonly<{
  disposition: "prepared" | "rejected";
  leadSource: "voice";
  activityType: "polyai_voice_call";
  nextAction: string;
  followUpRequired: boolean;
  providerExecutionAllowed: false;
  crmWriteAllowed: false;
  reason: string;
}>;

export function planPolyAiCrmWrite(envelope: PolyAiCrmCallEnvelope): PolyAiCrmWritePlan {
  const hasConversationId = envelope.providerConversationId.trim().length > 0;

  if (!hasConversationId) {
    return {
      disposition: "rejected",
      leadSource: "voice",
      activityType: "polyai_voice_call",
      nextAction: "Review rejected PolyAI call event",
      followUpRequired: false,
      providerExecutionAllowed: false,
      crmWriteAllowed: false,
      reason: "Missing provider conversation ID.",
    };
  }

  const followUpRequired =
    envelope.callbackRequested ||
    envelope.transferRequested ||
    envelope.outcome === "callback_requested";

  return {
    disposition: "prepared",
    leadSource: "voice",
    activityType: "polyai_voice_call",
    nextAction: followUpRequired
      ? "Review PolyAI call and complete adviser follow-up"
      : "Review PolyAI call summary",
    followUpRequired,
    providerExecutionAllowed: false,
    crmWriteAllowed: false,
    reason:
      "Validated CRM write plan only. Persistence remains locked until the authenticated CRM tool gateway is connected.",
  };
}
