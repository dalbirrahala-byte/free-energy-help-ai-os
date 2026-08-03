import type { RenewalTimingValue, WebsiteLeadPriority } from "./types";

export function priorityFromRenewalTiming(
  timing: RenewalTimingValue,
): WebsiteLeadPriority {
  if (timing === "within_30_days") {
    return "Hot";
  }

  if (timing === "31_90_days" || timing === "3_6_months") {
    return "Warm";
  }

  return "Nurture";
}

export function recommendedNextActionForPriority(
  priority: WebsiteLeadPriority,
): string {
  switch (priority) {
    case "Hot":
      return "Call immediately and confirm contract end date.";
    case "Warm":
      return "Call today and arrange a contract review.";
    default:
      return "Confirm renewal date and schedule future follow-up.";
  }
}

export function priorityBadgeClass(priority: WebsiteLeadPriority): string {
  switch (priority) {
    case "Hot":
      return "bg-red-100 text-red-900";
    case "Warm":
      return "bg-amber-100 text-amber-950";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
