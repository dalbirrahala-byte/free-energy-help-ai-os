import type { AgentRegistryEntry } from "./types";

/**
 * Initial agent registry (FACTORY-005 Phase A).
 * Configuration data only — not live agent telemetry.
 */
export const AGENT_REGISTRY: AgentRegistryEntry[] = [
  {
    id: "chief-architect",
    name: "Chief Architect",
    role: "Technical direction, specs, and architecture review",
    actorType: "AI",
    permissionsSummary:
      "Read repo; write factory plans; propose governance docs; no app code without approved spec and PO sign-off.",
    configuredStatus: "Offline",
    automationConnection: "not_connected",
  },
  {
    id: "senior-developer",
    name: "Senior Developer",
    role: "Implementation and delivery in approved scope",
    actorType: "AI",
    permissionsSummary:
      "Implement approved plans in frontend/lib; open PRs; no schema or production changes without gates.",
    configuredStatus: "Offline",
    automationConnection: "not_connected",
  },
  {
    id: "database-engineer",
    name: "Database Engineer",
    role: "Supabase schema, migrations, and data integrity",
    actorType: "AI",
    permissionsSummary:
      "Author migrations and RLS intent; no apply to production without PO approval.",
    configuredStatus: "Offline",
    automationConnection: "not_connected",
  },
  {
    id: "qa-engineer",
    name: "QA Engineer",
    role: "Quality evidence, lint, typecheck, and test coverage",
    actorType: "AI",
    permissionsSummary:
      "Run CI checks; report defects; cannot merge or deploy.",
    configuredStatus: "Offline",
    automationConnection: "not_connected",
  },
  {
    id: "security-engineer",
    name: "Security Engineer",
    role: "Security review for code, auth, and data handling",
    actorType: "AI",
    permissionsSummary:
      "Review PRs for security; flag secrets and RLS gaps; no production access.",
    configuredStatus: "Offline",
    automationConnection: "not_connected",
  },
  {
    id: "documentation-engineer",
    name: "Documentation Engineer",
    role: "Factory docs, registry, and release notes",
    actorType: "AI",
    permissionsSummary:
      "Maintain docs/factory and AGENTS.md; no application behaviour changes without plan.",
    configuredStatus: "Offline",
    automationConnection: "not_connected",
  },
  {
    id: "automation-engineer",
    name: "Automation Engineer",
    role: "CI, workflows, and integration scaffolding",
    actorType: "AI",
    permissionsSummary:
      "Propose GitHub Actions and automation; changes require review and PO merge approval.",
    configuredStatus: "Offline",
    automationConnection: "not_connected",
  },
  {
    id: "crm-business-analyst",
    name: "CRM Business Analyst",
    role: "UK B2B energy broker domain and CRM requirements",
    actorType: "AI",
    permissionsSummary:
      "Define CRM acceptance criteria; align leads, customers, sites, and tasks with business rules.",
    configuredStatus: "Offline",
    automationConnection: "not_connected",
  },
  {
    id: "product-owner",
    name: "Product Owner",
    role: "Human prioritisation, approval, and production gates",
    actorType: "Human",
    permissionsSummary:
      "Approve specs and merges; sole authority for production deploy and production Supabase apply.",
    configuredStatus: "Available",
    automationConnection: "not_connected",
  },
];
