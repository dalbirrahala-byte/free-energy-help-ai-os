/**
 * Shared boolean feature-flag reader, used by every feature-flag module in
 * the intelligence layer (lib/intelligence, lib/feh-enterprise-intelligence,
 * lib/ai-workforce). Each module keeps its own named, documented functions
 * (e.g. `isEnterpriseIntelligenceEngineEnabled`) — only the underlying
 * "read this env var, fall back to a safe default" logic is shared, so a
 * convention change (e.g. supporting "1"/"0") only needs to happen once.
 *
 * Behaviour is unchanged from every prior independent implementation:
 * - defaultValue true: any value other than exactly "false" (trimmed,
 *   case-insensitive) counts as enabled.
 * - defaultValue false: only exactly "true" (trimmed, case-insensitive)
 *   counts as enabled.
 * - Env var unset: returns defaultValue.
 */
export function readBooleanFlag(envVarName: string, defaultValue: boolean): boolean {
  const raw = process.env[envVarName];

  if (raw === undefined) {
    return defaultValue;
  }

  const normalized = raw.trim().toLowerCase();

  if (defaultValue) {
    return normalized !== "false";
  }

  return normalized === "true";
}
