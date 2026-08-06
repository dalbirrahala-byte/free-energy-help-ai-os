import { readBooleanFlag } from "../shared/featureFlags.ts";

const V2_FLAG_ENV_VAR = "USE_COMMERCIAL_INTELLIGENCE_V2";

/**
 * Default true. Set USE_COMMERCIAL_INTELLIGENCE_V2=false on the server to
 * instantly roll back to V1-only behaviour — no code change or redeploy of
 * logic required, just the environment variable. Server-side only; never
 * read from a NEXT_PUBLIC_ variable, never sent to the browser.
 */
export function isCommercialIntelligenceV2Enabled(): boolean {
  return readBooleanFlag(V2_FLAG_ENV_VAR, true);
}
