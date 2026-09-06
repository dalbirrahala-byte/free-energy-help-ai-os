export function buildWhatsAppMessageIdempotencyKey(providerMessageId: string): string | null {
  const id = providerMessageId.trim();
  if (!id || id.length > 200) return null;
  return `whatsapp:${id}`;
}
