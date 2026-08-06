import { notYetConfiguredResult } from "./notYetConfigured.ts";

import type { Worker, WorkerDescriptor, WorkerExecutionInput, WorkerResult } from "../types";

const REASON =
  "Voice AI remains at the Voice Foundation V0 design stage (docs/VOICE_ARCHITECTURE.md, docs/VOICE_TEST_PLAN.md, docs/VOICE_PROVIDER_SCORECARD.md). No provider has been selected — that requires the blind-testing protocol to actually run first — and no telephony, STT, LLM, or TTS connection exists. Call/transcript storage additionally requires the authentication and RLS gaps in docs/MASTER_ARCHITECTURE.md §8 to be resolved first. This worker's interface exists so a real implementation can slot in later without a contract change.";

const DESCRIPTOR: WorkerDescriptor = {
  id: "voice",
  name: "Voice AI",
  responsibility: "Conducts and manages AI-driven voice conversations with callers.",
  capabilities: [
    { id: "conversationalFlow", label: "Conversational flow", description: "Requires a selected, connected provider stack.", implemented: false },
    { id: "transcription", label: "Full transcript", description: "Requires a connected STT provider.", implemented: false },
    { id: "callSummary", label: "Call summary written to CRM", description: "Requires call data plus resolved auth/RLS gaps before any write.", implemented: false },
    { id: "sentimentAnalysis", label: "Sentiment analysis", description: "Requires real transcript data.", implemented: false },
    { id: "qualityScoring", label: "Quality scoring", description: "Governed by the Voice Quality Gate in docs/VOICE_TEST_PLAN.md.", implemented: false },
    { id: "coachingRecommendations", label: "Coaching recommendations", description: "Requires real call history to learn from.", implemented: false },
  ],
  status: "not_yet_configured",
};

export const voiceAiWorker: Worker = {
  describe: () => DESCRIPTOR,
  execute(input: WorkerExecutionInput): WorkerResult {
    return notYetConfiguredResult("voice", REASON, input.today ?? new Date());
  },
};
