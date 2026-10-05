export const FEH_ASSISTANT_VOICE_PROFILE = {
  provider: "HeyGen",
  label: "FEH Corporate Assistant Voice",
  voiceId: "eb2f4e47e05e4ddcbd7fefd6ed805a82",
  locale: "en-GB",
  speed: 0.95,
  pitch: 0,
  volume: 1,
  referenceVideo: {
    id: "5c6234f5f2d54d83f1b96ccbb092399a",
    title: "Free Energy Help - Corporate Introduction Final",
    durationSeconds: 43.1804,
  },
  runtimeStatus: "Profile configured — live CRM synthesis not connected",
  disclosure:
    "Hello, you’re speaking with the Free Energy Help AI assistant. How can I help today?",
} as const;

export type FehAssistantVoiceProfile = typeof FEH_ASSISTANT_VOICE_PROFILE;
