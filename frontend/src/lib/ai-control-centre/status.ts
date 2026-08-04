import type { ServiceStatusInfo } from "./types";

const CHECK_TIMEOUT_MS = 3000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveClaudeStatus(): Promise<ServiceStatusInfo> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      id: "claude",
      name: "Claude AI",
      status: "Not configured",
      detail: "ANTHROPIC_API_KEY is not set on the server.",
    };
  }

  try {
    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/models",
      { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } },
    );

    return response.ok
      ? {
          id: "claude",
          name: "Claude AI",
          status: "Connected",
          detail: "Verified against the Anthropic API.",
        }
      : {
          id: "claude",
          name: "Claude AI",
          status: "Unavailable",
          detail: `Anthropic API responded with status ${response.status}.`,
        };
  } catch {
    return {
      id: "claude",
      name: "Claude AI",
      status: "Unavailable",
      detail: "Could not reach the Anthropic API.",
    };
  }
}

async function resolveOpenAiStatus(): Promise<ServiceStatusInfo> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      id: "openai",
      name: "OpenAI GPT",
      status: "Not configured",
      detail: "OPENAI_API_KEY is not set on the server.",
    };
  }

  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    return response.ok
      ? {
          id: "openai",
          name: "OpenAI GPT",
          status: "Connected",
          detail: "Verified against the OpenAI API.",
        }
      : {
          id: "openai",
          name: "OpenAI GPT",
          status: "Unavailable",
          detail: `OpenAI API responded with status ${response.status}.`,
        };
  } catch {
    return {
      id: "openai",
      name: "OpenAI GPT",
      status: "Unavailable",
      detail: "Could not reach the OpenAI API.",
    };
  }
}

async function resolveGeminiStatus(): Promise<ServiceStatusInfo> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      id: "gemini",
      name: "Gemini",
      status: "Not configured",
      detail: "GEMINI_API_KEY is not set on the server.",
    };
  }

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {},
    );

    return response.ok
      ? {
          id: "gemini",
          name: "Gemini",
          status: "Connected",
          detail: "Verified against the Gemini API.",
        }
      : {
          id: "gemini",
          name: "Gemini",
          status: "Unavailable",
          detail: `Gemini API responded with status ${response.status}.`,
        };
  } catch {
    return {
      id: "gemini",
      name: "Gemini",
      status: "Unavailable",
      detail: "Could not reach the Gemini API.",
    };
  }
}

async function resolveN8nStatus(): Promise<ServiceStatusInfo> {
  const baseUrl = process.env.N8N_BASE_URL;

  if (!baseUrl) {
    return {
      id: "n8n",
      name: "n8n",
      status: "Not configured",
      detail: "N8N_BASE_URL is not set on the server.",
    };
  }

  try {
    const healthUrl = new URL("/healthz", baseUrl).toString();
    const response = await fetchWithTimeout(healthUrl, {});

    return response.ok
      ? {
          id: "n8n",
          name: "n8n",
          status: "Connected",
          detail: "Health check succeeded.",
        }
      : {
          id: "n8n",
          name: "n8n",
          status: "Unavailable",
          detail: `n8n responded with status ${response.status}.`,
        };
  } catch {
    return {
      id: "n8n",
      name: "n8n",
      status: "Unavailable",
      detail: "Could not reach the n8n instance.",
    };
  }
}

function resolveSupabaseStatus(connected: boolean): ServiceStatusInfo {
  return connected
    ? {
        id: "supabase",
        name: "Supabase",
        status: "Connected",
        detail: "Live query against the leads table succeeded.",
      }
    : {
        id: "supabase",
        name: "Supabase",
        status: "Unavailable",
        detail: "Could not query Supabase. Check project URL and key.",
      };
}

function resolveSeoStatus(): ServiceStatusInfo {
  return {
    id: "seo",
    name: "Website SEO",
    status: "Checking",
    detail: "Automated SEO health checks are not yet implemented.",
  };
}

export async function loadAiControlCentreStatus(
  supabaseConnected: boolean,
): Promise<ServiceStatusInfo[]> {
  const [claude, openai, gemini, n8n] = await Promise.all([
    resolveClaudeStatus(),
    resolveOpenAiStatus(),
    resolveGeminiStatus(),
    resolveN8nStatus(),
  ]);

  return [
    claude,
    openai,
    gemini,
    n8n,
    resolveSupabaseStatus(supabaseConnected),
    resolveSeoStatus(),
  ];
}
