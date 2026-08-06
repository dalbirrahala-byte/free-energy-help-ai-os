import type { ConversationContextInput } from "../types";
import type { NormalizedConversationContext } from "./contextTypes";

/**
 * No conversation/voice data source exists anywhere in this project yet —
 * Voice Foundation is design-only (see docs/VOICE_ARCHITECTURE.md). This
 * always reports "not supplied" honestly rather than fabricating a
 * transcript or sentiment signal. Exists now so the contract shape is
 * ready for when a real source exists.
 */
export function buildConversationContext(
  input: ConversationContextInput | null | undefined,
): NormalizedConversationContext {
  if (!input) {
    return { supplied: false, transcriptAvailable: false };
  }

  return { supplied: true, transcriptAvailable: input.transcriptAvailable };
}
