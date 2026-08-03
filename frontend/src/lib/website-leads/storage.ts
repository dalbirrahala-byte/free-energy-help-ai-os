import {
  WEBSITE_LEADS_CHANGED_EVENT,
  WEBSITE_LEADS_SEQUENCE_KEY,
  WEBSITE_LEADS_STORAGE_KEY,
} from "./constants";
import { formatLeadDateTime, formatLeadReference, renewalTimingLabel } from "./labels";
import {
  priorityFromRenewalTiming,
  recommendedNextActionForPriority,
} from "./priority";
import type {
  RenewalTimingValue,
  WebsiteLead,
  WebsiteLeadFormInput,
  WebsiteLeadNote,
  WebsiteLeadStatus,
} from "./types";
import { isValidRenewalTiming } from "./validation";

function readSequence(): number {
  if (typeof window === "undefined") {
    return 1;
  }

  const raw = window.localStorage.getItem(WEBSITE_LEADS_SEQUENCE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function writeSequence(next: number): void {
  window.localStorage.setItem(WEBSITE_LEADS_SEQUENCE_KEY, String(next));
}

function readAllRaw(): WebsiteLead[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WEBSITE_LEADS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as WebsiteLead[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function notifyWebsiteLeadsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WEBSITE_LEADS_CHANGED_EVENT));
  }
}

function writeAll(leads: WebsiteLead[]): void {
  window.localStorage.setItem(WEBSITE_LEADS_STORAGE_KEY, JSON.stringify(leads));
  notifyWebsiteLeadsChanged();
}

export function listWebsiteLeads(): WebsiteLead[] {
  return readAllRaw().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getWebsiteLeadByReference(reference: string): WebsiteLead | null {
  return readAllRaw().find((lead) => lead.leadReference === reference) ?? null;
}

export function countNewWebsiteLeads(): number {
  return readAllRaw().filter((lead) => lead.status === "New").length;
}

export function createWebsiteLeadFromForm(input: WebsiteLeadFormInput): WebsiteLead {
  if (typeof window === "undefined") {
    throw new Error("Website leads can only be created in the browser.");
  }

  if (!isValidRenewalTiming(input.renewalTiming)) {
    throw new Error("Invalid renewal timing.");
  }

  const timing = input.renewalTiming as RenewalTimingValue;
  const sequence = readSequence() + 1;
  const now = new Date().toISOString();
  const priority = priorityFromRenewalTiming(timing);

  const lead: WebsiteLead = {
    leadReference: formatLeadReference(sequence),
    businessName: input.businessName.trim(),
    contactName: input.contactName.trim(),
    telephone: input.telephone.trim(),
    email: input.email.trim(),
    postcode: input.postcode.trim().toUpperCase(),
    renewalTiming: timing,
    renewalTimingLabel: renewalTimingLabel(timing),
    consentAt: now,
    createdAt: now,
    createdAtLabel: formatLeadDateTime(now),
    source: "Website",
    status: "New",
    priority,
    recommendedNextAction: recommendedNextActionForPriority(priority),
    notes: [],
  };

  const leads = readAllRaw();
  leads.unshift(lead);
  writeAll(leads);
  writeSequence(sequence);

  return lead;
}

export function updateWebsiteLead(
  reference: string,
  updater: (lead: WebsiteLead) => WebsiteLead,
): WebsiteLead | null {
  const leads = readAllRaw();
  const index = leads.findIndex((lead) => lead.leadReference === reference);
  if (index === -1) {
    return null;
  }

  const updated = updater(leads[index]);
  leads[index] = updated;
  writeAll(leads);
  return updated;
}

export function setWebsiteLeadStatus(
  reference: string,
  status: WebsiteLeadStatus,
): WebsiteLead | null {
  return updateWebsiteLead(reference, (lead) => ({ ...lead, status }));
}

export function addWebsiteLeadNote(
  reference: string,
  body: string,
): WebsiteLead | null {
  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const note: WebsiteLeadNote = {
    id: `note-${createdAt}`,
    body: trimmed,
    createdAt,
    createdLabel: formatLeadDateTime(createdAt),
  };

  return updateWebsiteLead(reference, (lead) => ({
    ...lead,
    notes: [note, ...lead.notes],
  }));
}
