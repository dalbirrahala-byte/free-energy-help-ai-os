import { readFile } from "node:fs/promises";
import path from "node:path";

import type { FactoryOpsInfo } from "./types";

const NOT_CONFIGURED = "Not configured";

function factoryDocsPath(fileName: string): string {
  return path.join(process.cwd(), "..", "docs", "factory", fileName);
}

async function readFactoryFile(fileName: string): Promise<string | null> {
  try {
    return await readFile(factoryDocsPath(fileName), "utf8");
  } catch {
    return null;
  }
}

function parseQueueRows(markdown: string): string[][] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| FACTORY-"))
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean),
    );
}

export async function loadFactoryOpsInfo(): Promise<FactoryOpsInfo> {
  if (process.env.NODE_ENV !== "development") {
    return {
      documentationStatus: NOT_CONFIGURED,
      currentTask: NOT_CONFIGURED,
      waitingApproval: [],
      milestone: NOT_CONFIGURED,
    };
  }

  const queueMarkdown = await readFactoryFile("FEATURE_QUEUE.md");

  if (!queueMarkdown) {
    return {
      documentationStatus: NOT_CONFIGURED,
      currentTask: NOT_CONFIGURED,
      waitingApproval: [],
      milestone: NOT_CONFIGURED,
    };
  }

  const rows = parseQueueRows(queueMarkdown);
  const inProgress = rows.find((row) =>
    row.some((cell) => /in progress/i.test(cell)),
  );
  const waitingReview = rows.filter((row) =>
    row.some((cell) => /in review|waiting review/i.test(cell)),
  );

  const currentTask = inProgress
    ? `${inProgress[0]} — ${inProgress[1] ?? "Task"}`
    : NOT_CONFIGURED;

  const waitingApproval = waitingReview.map(
    (row) => `${row[0]} — ${row[1] ?? "Item"}`,
  );

  const roadmap = await readFactoryFile("ROADMAP.md");
  const milestone =
    roadmap && roadmap.includes("v0.1")
      ? "v0.1 AI Factory (documentation in repo)"
      : NOT_CONFIGURED;

  return {
    documentationStatus: "Available (local development)",
    currentTask,
    waitingApproval,
    milestone,
  };
}

export function resolveAiStatus(factory: FactoryOpsInfo): string {
  if (factory.documentationStatus === NOT_CONFIGURED) {
    return NOT_CONFIGURED;
  }

  return "Factory docs connected";
}
