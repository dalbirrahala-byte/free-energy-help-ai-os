/**
 * True for any non-empty, non-whitespace-only string. Accepts `unknown` so
 * it works uniformly at both of its previous call sites (one was typed
 * `string | null`, the other `unknown`) without narrowing either caller —
 * behaviourally identical to both prior implementations for every string,
 * null, or undefined input.
 */
export function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
