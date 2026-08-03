"use client";

import { useSyncExternalStore } from "react";

import { WEBSITE_LEADS_CHANGED_EVENT } from "@/lib/website-leads/constants";
import {
  countNewWebsiteLeads,
  getWebsiteLeadByReference,
  listWebsiteLeads,
} from "@/lib/website-leads/storage";
import type { WebsiteLead } from "@/lib/website-leads/types";

const EMPTY_WEBSITE_LEADS: WebsiteLead[] = [];

let cachedWebsiteLeads: WebsiteLead[] = EMPTY_WEBSITE_LEADS;
let cachedWebsiteLeadsJson = "";

function getWebsiteLeadsSnapshot(): WebsiteLead[] {
  const latestWebsiteLeads = listWebsiteLeads();
  const latestWebsiteLeadsJson = JSON.stringify(latestWebsiteLeads);

  if (latestWebsiteLeadsJson !== cachedWebsiteLeadsJson) {
    cachedWebsiteLeads = latestWebsiteLeads;
    cachedWebsiteLeadsJson = latestWebsiteLeadsJson;
  }

  return cachedWebsiteLeads;
}

function subscribeWebsiteLeads(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WEBSITE_LEADS_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WEBSITE_LEADS_CHANGED_EVENT, onStoreChange);
  };
}

export function useWebsiteLeads(): WebsiteLead[] {
  return useSyncExternalStore(
    subscribeWebsiteLeads,
    getWebsiteLeadsSnapshot,
    () => EMPTY_WEBSITE_LEADS,
  );
}

export function useNewWebsiteLeadCount(): number {
  return useSyncExternalStore(
    subscribeWebsiteLeads,
    countNewWebsiteLeads,
    () => 0,
  );
}

export function useWebsiteLead(leadReference: string): WebsiteLead | null {
  return useSyncExternalStore(
    subscribeWebsiteLeads,
    () => getWebsiteLeadByReference(leadReference),
    () => null,
  );
}