export type ServiceStatus = "Connected" | "Not configured" | "Unavailable" | "Checking";

export type ServiceId = "claude" | "openai" | "gemini" | "n8n" | "supabase" | "seo";

export type ServiceStatusInfo = {
  id: ServiceId;
  name: string;
  status: ServiceStatus;
  detail: string;
};
