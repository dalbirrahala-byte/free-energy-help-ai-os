import { notYetConfiguredResult } from "./notYetConfigured.ts";

import type { Worker, WorkerDescriptor, WorkerExecutionInput, WorkerResult } from "../types";

const REASON =
  "Marketing Intelligence Engine is design-only (see docs/MARKETING_INTELLIGENCE_ENGINE.md). Every capability here needs an external integration (SEO tooling, LinkedIn, email platform, web analytics) that this project has not connected — none has been simulated.";

const DESCRIPTOR: WorkerDescriptor = {
  id: "marketingDirector",
  name: "Marketing Director AI",
  responsibility: "Coordinates marketing intelligence: SEO, campaigns, content, and lead nurturing.",
  capabilities: [
    { id: "seoIntelligence", label: "SEO intelligence", description: "Site health and ranking signals.", implemented: false },
    { id: "regionalCampaignPlanning", label: "Regional campaign planning", description: "Geographic targeting from real conversion data.", implemented: false },
    { id: "landingPageOptimisation", label: "Landing-page optimisation", description: "Real conversion-rate signals per page.", implemented: false },
    { id: "contentGeneration", label: "Content generation", description: "AI-assisted content drafting, human-reviewed.", implemented: false },
    { id: "linkedInCampaigns", label: "LinkedIn campaigns", description: "Requires a connected LinkedIn integration.", implemented: false },
    { id: "emailCampaigns", label: "Email campaigns", description: "Requires a connected email platform.", implemented: false },
    { id: "leadNurturing", label: "Lead nurturing", description: "Sequenced follow-up from real engagement data.", implemented: false },
    { id: "websiteConversionAnalysis", label: "Website conversion analysis", description: "Requires connected web analytics.", implemented: false },
  ],
  status: "not_yet_configured",
};

export const marketingDirectorWorker: Worker = {
  describe: () => DESCRIPTOR,
  execute(input: WorkerExecutionInput): WorkerResult {
    return notYetConfiguredResult("marketingDirector", REASON, input.today ?? new Date());
  },
};
