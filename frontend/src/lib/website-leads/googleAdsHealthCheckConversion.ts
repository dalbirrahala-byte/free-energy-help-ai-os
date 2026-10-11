export const GOOGLE_ADS_HEALTH_CHECK_DESTINATION = "AW-18367227995/-_HSCLDN6YodENvQ1rZE";

type AcceptedHealthCheck = Readonly<{
  success: true;
  leadId: number;
  disposition: "created" | "duplicate_suppressed";
}>;

/** Read only own data fields from the Server Action response; never coerce a success or ID. */
export function readAcceptedHealthCheckResult(value: unknown): AcceptedHealthCheck | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const fields = Object.getOwnPropertyDescriptors(value);
    const ownValue = (key: string) => Object.hasOwn(fields, key) && Object.hasOwn(fields[key], "value") ? fields[key].value : undefined;
    const success = ownValue("success");
    const leadId = ownValue("leadId");
    const disposition = ownValue("disposition");
    if (success !== true || typeof leadId !== "number" || !Number.isSafeInteger(leadId) || leadId <= 0 ||
        (disposition !== "created" && disposition !== "duplicate_suppressed")) return null;
    return Object.freeze({ success: true, leadId, disposition });
  } catch {
    return null;
  }
}

type Gtag = (command: "event", event: "conversion", parameters: Readonly<{
  send_to: typeof GOOGLE_ADS_HEALTH_CHECK_DESTINATION;
  transaction_id: string;
}>) => void;

/** Factory isolates deterministic tests; production uses the single tracker below. */
export function createGoogleAdsHealthCheckTracker(readGtag: () => unknown) {
  const attempted = new Set<number>();
  return (serverResult: unknown): void => {
    try {
      const accepted = readAcceptedHealthCheckResult(serverResult);
      if (!accepted || accepted.disposition !== "created" || attempted.has(accepted.leadId)) return;
      const gtag = readGtag();
      if (typeof gtag !== "function") return;
      // Reserve before dispatch: reentrant/repeated calls cannot send again. A throw
      // may occur after queueing, so never blindly retry that ambiguous attempt.
      attempted.add(accepted.leadId);
      (gtag as Gtag)("event", "conversion", Object.freeze({
        send_to: GOOGLE_ADS_HEALTH_CHECK_DESTINATION,
        transaction_id: `health-check-lead-${accepted.leadId}`,
      }));
    } catch {
      // Analytics must never change the outcome of an already accepted FEH enquiry.
    }
  };
}

// No loader, config/consent commands, listeners, cookies, storage or network client.
// Reuse the existing site's gtag and its consent handling, only after ingestion.
// The in-memory guard lasts for this module/page; the stable transaction ID also
// supports Google's duplicate-count protection across browser contexts.
export const trackGoogleAdsHealthCheckConversion = createGoogleAdsHealthCheckTracker(() => {
  if (typeof window === "undefined") return undefined;
  const gtag = (window as unknown as { gtag?: unknown }).gtag;
  return typeof gtag === "function" ? gtag.bind(window) : undefined;
});
