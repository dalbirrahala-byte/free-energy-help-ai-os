export const FEH_ASSISTANT_VOICE_PROFILE = {
  provider: "PolyAI",
  providerProduct: "Agent Studio",
  label: "FEH Business Energy Assistant",
  selectedVoiceName: "Harry",
  selectedVoiceStyle: "Steady and calm British voice",
  locale: "en-GB",
  providerSelectionStatus: "Selected after successful FEH test call",
  connectionStatus: "Not configured",
  runtimeStatus:
    "PolyAI selected — CRM integration contract configured; live provider connection not yet enabled",
  openingGreeting:
    "Hello, thank you for calling Free Energy Help. How can I help you today?",
  disclosure:
    "You’re speaking with the Free Energy Help virtual assistant. I can help with your business energy enquiry and arrange an adviser where needed.",
  transferNumber: "01332 605506",
  officeHours: {
    timezone: "Europe/London",
    mondayToFriday: "08:30-18:00",
    saturday: "09:00-13:00",
    sunday: "Closed",
  },
  callbackPolicy: {
    duringOpeningHours: "Same-day adviser callback",
    outOfHours: "Next working day adviser callback",
  },
} as const;

export type FehAssistantVoiceProfile = typeof FEH_ASSISTANT_VOICE_PROFILE;
