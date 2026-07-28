import { readFile } from "node:fs/promises";
import path from "node:path";

import { AGENT_REGISTRY } from "./agents.config";
import type {
  AgentCardViewModel,
  AgentRegistryEntry,
  AgentStatus,
  AiOperationsPageData,
  FactoryWorkItem,
  WorkforceSummary,
} from "./types";

const NOT_CONFIGURED = "Not configured";
const NOT_CONNECTED = "Not connected";
const CONFIGURATION_NOTE =
  "Registry configuration (Phase A) — not live agent telemetry.";

function environmentLabel(): string {
  if (process.env.VERCEL_ENV) {
    return `Vercel: ${process.env.VERCEL_ENV}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

async function registryDocumentationStatus(): Promise<string> {
  if (process.env.NODE_ENV !== "development") {
    return NOT_CONFIGURED;
  }

  try {
    const registryPath = path.join(
      process.cwd(),
      "..",
      "docs",
      "factory",
      "AGENT_REGISTRY.md",
    );
    await readFile(registryPath, "utf8");
    return "AGENT_REGISTRY.md present (local development)";
  } catch {
    return NOT_CONFIGURED;
  }
}

function entryToCardView(entry: AgentRegistryEntry): AgentCardViewModel {
  const liveFields =
    entry.automationConnection === "not_connected"
      ? NOT_CONNECTED
      : NOT_CONFIGURED;

  return {
    id: entry.id,
    name: entry.name,
    role: entry.role,
    status: entry.configuredStatus,
    currentTask: liveFields,
    queueSize: NOT_CONFIGURED,
    lastCompletedTask: NOT_CONFIGURED,
    waitingForApproval: NOT_CONFIGURED,
    lastActivity: liveFields,
    permissionsSummary: entry.permissionsSummary,
    configurationNote: CONFIGURATION_NOTE,
  };
}

function buildWorkforceSummary(agents: AgentCardViewModel[]): WorkforceSummary {
  const countByStatus = (status: AgentStatus) =>
    String(agents.filter((agent) => agent.status === status).length);

  return {
    totalAgents: String(agents.length),
    available: countByStatus("Available"),
    working: countByStatus("Working"),
    waitingForApproval: countByStatus("Waiting for Approval"),
    blocked: countByStatus("Blocked"),
    offline: countByStatus("Offline"),
  };
}

const EMPTY_WORK_ITEMS: FactoryWorkItem[] = [];

export async function loadAiOperationsData(): Promise<AiOperationsPageData> {
  const agents = AGENT_REGISTRY.map(entryToCardView);
  const agentsWorking = agents.filter((agent) => agent.status === "Working");

  const documentation = await registryDocumentationStatus();

  return {
    configurationLabel: CONFIGURATION_NOTE,
    workforce: buildWorkforceSummary(agents),
    agents,
    agentsWorking,
    waitingForApprovalItems: EMPTY_WORK_ITEMS,
    blockedWork: EMPTY_WORK_ITEMS,
    recentlyCompleted: EMPTY_WORK_ITEMS,
    factoryStatus: {
      registrySource: "FACTORY-003 agent registry (static configuration)",
      documentation,
      liveAutomation: NOT_CONNECTED,
      environmentLabel: environmentLabel(),
    },
  };
}
