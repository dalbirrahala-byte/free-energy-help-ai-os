import type { AgentCardViewModel } from "@/lib/ai-operations/types";

import { AgentCard } from "./AgentCard";

type AgentGridProps = {
  agents: AgentCardViewModel[];
  labelledBy?: string;
};

export function AgentGrid({ agents, labelledBy }: AgentGridProps) {
  return (
    <ul
      className="grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-labelledby={labelledBy}
    >
      {agents.map((agent) => (
        <li key={agent.id}>
          <AgentCard agent={agent} />
        </li>
      ))}
    </ul>
  );
}
