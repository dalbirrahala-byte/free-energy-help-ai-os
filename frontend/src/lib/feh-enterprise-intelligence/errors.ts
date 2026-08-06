import type { CapabilityId, SafeFailure } from "./types";

export function safeFailure(
  capabilityId: CapabilityId | "request" | "engine",
  code: string,
  message: string,
): SafeFailure {
  return { capabilityId, code, message };
}

const SENSITIVE_PATTERN = /[A-Za-z]:\\|\/[A-Za-z0-9_.-]+\/|key|token|secret|password|supabase|postgres|api[_-]?key/i;

function sanitizeMessage(message: string): string {
  if (SENSITIVE_PATTERN.test(message)) {
    return "An internal error occurred while executing this capability.";
  }
  return message;
}

/**
 * Wraps a capability execution failure so it never crashes the engine and
 * never leaks a stack trace, file path, key, token, or connection string to
 * the caller. Best-effort message sanitisation, not a substitute for
 * capabilities themselves never touching secrets in the first place — none
 * of them do.
 */
export function isolateCapabilityError(capabilityId: CapabilityId, error: unknown): SafeFailure {
  const message = error instanceof Error ? sanitizeMessage(error.message) : "Unknown error.";
  return safeFailure(capabilityId, "CAPABILITY_EXECUTION_FAILED", message);
}
