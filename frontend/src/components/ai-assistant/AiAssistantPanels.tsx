"use client";

import { useState } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import {
  AI_NOT_CONNECTED,
  DEMO_RECOMMENDATION,
  EMAIL_NOT_CONNECTED,
} from "@/lib/ai-assistant/constants";
import { PROMPT_LIBRARY, SUGGESTED_PROMPTS } from "@/lib/ai-assistant/prompts";
import type {
  BriefingItem,
  CallPrepDemo,
  CustomerSummaryDemo,
  DirectorBriefing,
  EmailDraftDemo,
  OpportunityCard,
  QuoteReviewFinding,
  RiskItem,
} from "@/lib/ai-assistant/types";
import type { AgentRole, NextBestAction } from "@/lib/ai-assistant/types";

export function AiDailyBriefingPanel({ items }: { items: BriefingItem[] }) {
  return (
    <SectionCard title="AI daily briefing" description={DEMO_RECOMMENDATION}>
      <ul className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm">
            <span className="font-semibold text-amber-950">{item.category}</span>
            <span className="ml-2 text-slate-700">{item.text}</span>
            <span className="mt-1 block text-xs text-amber-800">{DEMO_RECOMMENDATION}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function AskAiWorkspace({
  context,
  onContextChange,
  contexts,
}: {
  context: string;
  onContextChange: (v: string) => void;
  contexts: readonly string[];
}) {
  const [prompt, setPrompt] = useState("");

  return (
    <SectionCard title="Ask AI workspace" description={AI_NOT_CONNECTED}>
      <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">{AI_NOT_CONNECTED}</p>
      <label className="block">
        <span className="text-xs font-semibold uppercase text-slate-500">Prompt</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled
          placeholder="Enter a question — disabled in demo mode"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button key={p} type="button" disabled className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
            {p}
          </button>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase text-slate-500">Context selector</span>
        <select
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {contexts.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs text-slate-500">Record selector — Not configured (demo placeholder)</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold">Conversation history (demo)</h3>
          <p className="mt-2 text-sm text-slate-600">User: Summarise Derby Manufacturing…</p>
          <p className="mt-1 text-sm text-slate-600">Assistant: Demo static response — not connected.</p>
        </div>
        <div>
          <h3 className="text-sm font-bold">Sources / evidence (demo)</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            <li>Customer 360 demo profile</li>
            <li>Quote Engine register</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-bold">Draft response area</h3>
        <p className="mt-2 text-sm text-slate-600">No live model — demo placeholder text would appear here.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Copy", "Save as note", "Create task", "Draft email"].map((a) => (
            <button key={a} type="button" disabled className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-400">
              {a} — Not configured
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export function PromptLibraryPanel() {
  return (
    <SectionCard title="Suggested prompt library" description="Click disabled — demo catalogue">
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(PROMPT_LIBRARY).map(([area, prompts]) => (
          <div key={area} className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900">{area}</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {prompts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

const CUSTOMER_SUMMARY_LABELS: { key: keyof CustomerSummaryDemo; label: string }[] = [
  { key: "customer", label: "Customer" },
  { key: "profile", label: "Profile" },
  { key: "sites", label: "Sites" },
  { key: "contracts", label: "Contracts" },
  { key: "meters", label: "Meters" },
  { key: "annualConsumption", label: "Annual consumption" },
  { key: "currentSupplier", label: "Current supplier" },
  { key: "contractEnd", label: "Contract end date" },
  { key: "renewalPosition", label: "Renewal position" },
  { key: "quoteHistory", label: "Quote history" },
  { key: "commissionPosition", label: "Commission position" },
  { key: "recentContact", label: "Recent contact" },
  { key: "openTasks", label: "Open tasks" },
  { key: "risks", label: "Risks" },
  { key: "opportunities", label: "Opportunities" },
  { key: "suggestedNextAction", label: "Suggested next action" },
];

export function CustomerSummaryPanel({ data }: { data: CustomerSummaryDemo }) {
  return (
    <SectionCard title="AI customer summary" description="Demo data only">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CUSTOMER_SUMMARY_LABELS.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
            <dd className="text-sm text-slate-800">{data[key]}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function CallPreparationPanel({ data }: { data: CallPrepDemo }) {
  return (
    <SectionCard title="AI call preparation" description="Demo preparation">
      <dl className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["Customer overview", data.overview],
            ["Call objective", data.objective],
            ["Recent history", data.recentHistory],
            ["Previous objections", data.objections],
            ["Current supplier", data.supplier],
            ["Consumption", data.consumption],
            ["Contract end", data.contractEnd],
            ["Renewal probability", data.renewalProbability],
            ["Opening statement", data.openingStatement],
            ["Next step", data.nextStep],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
            <dd className="text-sm text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <ListBlock title="Questions to ask" items={data.questions} />
      <ListBlock title="Risks to avoid" items={data.risksToAvoid} />
    </SectionCard>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

export function EmailAssistantPanel({ drafts }: { drafts: EmailDraftDemo[] }) {
  return (
    <SectionCard title="AI email assistant" description={EMAIL_NOT_CONNECTED}>
      <p className="mb-4 text-sm text-slate-600">{EMAIL_NOT_CONNECTED}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {drafts.map((d) => (
          <article key={d.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <h3 className="font-bold">{d.type}</h3>
            <p className="mt-1 text-slate-500">To: {d.recipient}</p>
            <p className="font-semibold">{d.subject}</p>
            <p className="mt-2 text-slate-700">{d.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              Tone: {d.tone} · {d.purpose} · {d.approval} · {d.integration} · Status: {d.status}
            </p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export function QuoteReviewPanel({ findings }: { findings: QuoteReviewFinding[] }) {
  return (
    <SectionCard title="AI quote review" description="Demo review">
      <ul className="space-y-2">
        {findings.map((f) => (
          <li key={f.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <span className="font-semibold">{f.finding}</span> — {f.detail}
            <span className="ml-2 text-xs text-amber-800">Demo review</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function OpportunityEnginePanel({ items }: { items: OpportunityCard[] }) {
  return (
    <SectionCard title="AI opportunity engine" description="Demo opportunities">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((o) => (
          <div key={o.id} className="rounded-xl border border-slate-200 p-3 text-sm">
            <p className="font-bold">{o.type}</p>
            <p>{o.customer}</p>
            <p className="text-slate-600">{o.estimatedValue} · {o.confidence}</p>
            <p className="text-xs text-slate-500">{o.evidence}</p>
            <p className="text-xs text-slate-500">{o.action} · {o.owner} · {o.status}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function NextBestActionPanel({ actions }: { actions: NextBestAction[] }) {
  return (
    <SectionCard title="AI next-best-action panel" description="Actions not configured">
      <ul className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <li key={a.id}>
            <button type="button" disabled className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400" title={a.reason}>
              {a.action} — Not configured
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function RiskCentrePanel({ risks }: { risks: RiskItem[] }) {
  return (
    <SectionCard title="AI risk centre" description="Demo risk register">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Risk", "Severity", "Evidence", "Action", "Owner", "Review"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2">{r.type}</td>
                <td className="px-2 py-2">{r.severity}</td>
                <td className="px-2 py-2">{r.evidence}</td>
                <td className="px-2 py-2">{r.action}</td>
                <td className="px-2 py-2">{r.owner}</td>
                <td className="px-2 py-2">{r.reviewDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function DirectorBriefingPanel({ data }: { data: DirectorBriefing }) {
  return (
    <SectionCard title="AI director briefing" description="Demo executive insight">
      <dl className="grid gap-3 sm:grid-cols-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="text-sm text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function AgentCataloguePanel({ agents }: { agents: AgentRole[] }) {
  return (
    <SectionCard title="AI agent catalogue" description="Role cards — not connected">
      <div className="grid gap-4 lg:grid-cols-2">
        {agents.map((a) => (
          <article key={a.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <h3 className="font-bold">{a.role}</h3>
            <p className="text-slate-500">{a.status}</p>
            <p className="mt-2">{a.purpose}</p>
            <p className="mt-1 text-xs text-slate-600">Data: {a.dataRequired}</p>
            <p className="text-xs">Allowed: {a.allowedActions}</p>
            <p className="text-xs">Blocked: {a.blockedActions}</p>
            <p className="text-xs">Approval: {a.approval}</p>
            <p className="text-xs">Integration: {a.integration}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export function GovernancePanel({ items }: { items: readonly string[] }) {
  return (
    <SectionCard title="AI governance and safety" description="Platform controls">
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm">{item}</li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function ResponseConfidencePanel({
  confidence,
}: {
  confidence: import("@/lib/ai-assistant/types").ResponseConfidence;
}) {
  const c = confidence;
  return (
    <SectionCard title="AI response confidence" description="Demo metadata">
      <dl className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["Confidence level", c.level],
            ["Data completeness", c.dataCompleteness],
            ["Source modules", c.sourceModules],
            ["Last data refresh", c.lastRefresh],
            ["Human approval", c.humanApproval],
            ["Integration status", c.integrationStatus],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}
