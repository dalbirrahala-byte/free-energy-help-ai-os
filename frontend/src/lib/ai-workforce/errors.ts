import type { SafeFailure, WorkerId } from "./types";

export function safeFailure(workerId: WorkerId | "request" | "orchestrator", code: string, message: string): SafeFailure {
  return { workerId, code, message };
}

const SENSITIVE_PATTERN = /[A-Za-z]:\\|\/[A-Za-z0-9_.-]+\/|key|token|secret|password|supabase|postgres|api[_-]?key/i;

function sanitizeMessage(message: string): string {
  if (SENSITIVE_PATTERN.test(message)) {
    return "An internal error occurred while executing this worker.";
  }
  return message;
}

/**
 * Wraps a worker execution failure so it never crashes the orchestrator and
 * never leaks a stack trace, file path, key, token, or connection string.
 * Same discipline as lib/feh-enterprise-intelligence/errors.ts.
 */
export function isolateWorkerError(workerId: WorkerId, error: unknown): SafeFailure {
  const message = error instanceof Error ? sanitizeMessage(error.message) : "Unknown error.";
  return safeFailure(workerId, "WORKER_EXECUTION_FAILED", message);
}
