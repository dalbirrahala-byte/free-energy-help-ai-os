"use client";

import { useMemo, useState } from "react";

import {
  FACTORY_044_SIGNAL_FAMILIES,
  buildDiscoveryQueries,
  buildPublicWebEvidence,
  type Factory044SignalFamily,
  type PublicWebEvidence,
} from "./factory044Discovery";
import {
  evaluateFehIntelligence,
  type ComplianceState,
  type IdentityResolutionState,
} from "./factory044Intelligence";

type EvidenceDraft = {
  candidateName: string;
  sourceUrl: string;
  sourceTitle: string;
  signalFamily: Factory044SignalFamily;
  signalType: string;
  confidence: string;
};

const emptyDraft: EvidenceDraft = {
  candidateName: "",
  sourceUrl: "",
  sourceTitle: "",
  signalFamily: "BUSINESS_CHANGE",
  signalType: "expansion",
  confidence: "70",
};

export function LeadIntelligenceWorkbench() {
  const [sector, setSector] = useState("manufacturing");
  const [locations, setLocations] = useState("Derby, Burton upon Trent");
  const [families, setFamilies] = useState<Factory044SignalFamily[]>([
    "BUSINESS_CHANGE",
    "PROPERTY_DEVELOPMENT",
    "ENERGY_DEMAND",
  ]);
  const [evidence, setEvidence] = useState<PublicWebEvidence[]>([]);
  const [draft, setDraft] = useState<EvidenceDraft>(emptyDraft);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [identityResolution, setIdentityResolution] = useState<IdentityResolutionState>("UNRESOLVED");
  const [complianceState, setComplianceState] = useState<ComplianceState>("REVIEW_REQUIRED");
  const [suppressionMatched, setSuppressionMatched] = useState(false);

  const plannedQueries = useMemo(
    () =>
      buildDiscoveryQueries({
        sector,
        locations: locations.split(",").map((value) => value.trim()).filter(Boolean),
        signalFamilies: families,
      }),
    [families, locations, sector],
  );

  const decision = useMemo(
    () =>
      evaluateFehIntelligence({
        evidence,
        identityResolution,
        complianceState,
        suppressionMatched,
        knownCrmRelationship: false,
      }),
    [complianceState, evidence, identityResolution, suppressionMatched],
  );

  function toggleFamily(family: Factory044SignalFamily) {
    setFamilies((current) =>
      current.includes(family) ? current.filter((item) => item !== family) : [...current, family],
    );
  }

  function addEvidence() {
    setEvidenceError(null);
    const confidence = Number(draft.confidence);
    try {
      const item = buildPublicWebEvidence({
        candidateName: draft.candidateName,
        sourceUrl: draft.sourceUrl,
        sourceTitle: draft.sourceTitle,
        sourceExcerpt: null,
        observedAt: new Date().toISOString(),
        signalFamily: draft.signalFamily,
        signalType: draft.signalType,
        sourceVerified: true,
        aiInferred: false,
        confidence: Number.isInteger(confidence) ? confidence : null,
        provenance: "PUBLIC",
      });
      setEvidence((current) => [...current, item]);
      setDraft(emptyDraft);
    } catch {
      setEvidenceError("Evidence was not accepted. Check the company, source URL, title, signal and confidence (0–100).");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">1. Discovery instructions</h2>
            <p className="mt-1 text-sm text-slate-600">FEH prepares deterministic research techniques. It does not crawl or contact anyone here.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">Planning only</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Sector
            <input value={sector} onChange={(event) => setSector(event.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-medium">Locations, comma separated
            <input value={locations} onChange={(event) => setLocations(event.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {FACTORY_044_SIGNAL_FAMILIES.map((family) => {
            const selected = families.includes(family);
            return (
              <button key={family} type="button" onClick={() => toggleFamily(family)} className={`rounded-full border px-3 py-1 text-xs ${selected ? "bg-slate-900 text-white" : "bg-white"}`}>
                {family.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>
        <div className="mt-5 max-h-80 space-y-2 overflow-auto rounded-md bg-slate-50 p-3">
          {plannedQueries.length === 0 ? <p className="text-sm text-slate-500">Choose a sector and at least one signal family.</p> : plannedQueries.slice(0, 18).map((item) => (
            <div key={`${item.signalFamily}:${item.query}`} className="rounded border bg-white p-3">
              <p className="font-mono text-sm">{item.query}</p>
              <p className="mt-1 text-xs text-slate-500">{item.signalFamily} · {item.technique}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-5">
        <h2 className="text-lg font-semibold">2. Reviewed evidence</h2>
        <p className="mt-1 text-sm text-slate-600">Only evidence you deliberately enter is scored in Phase 3. Source provenance is retained.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input aria-label="Candidate company" placeholder="Candidate company" value={draft.candidateName} onChange={(event) => setDraft({ ...draft, candidateName: event.target.value })} className="rounded-md border px-3 py-2 text-sm" />
          <input aria-label="Source URL" placeholder="https://source.example/..." value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} className="rounded-md border px-3 py-2 text-sm" />
          <input aria-label="Source title" placeholder="Source title" value={draft.sourceTitle} onChange={(event) => setDraft({ ...draft, sourceTitle: event.target.value })} className="rounded-md border px-3 py-2 text-sm" />
          <input aria-label="Signal type" placeholder="Signal type" value={draft.signalType} onChange={(event) => setDraft({ ...draft, signalType: event.target.value })} className="rounded-md border px-3 py-2 text-sm" />
          <select aria-label="Signal family" value={draft.signalFamily} onChange={(event) => setDraft({ ...draft, signalFamily: event.target.value as Factory044SignalFamily })} className="rounded-md border px-3 py-2 text-sm">
            {FACTORY_044_SIGNAL_FAMILIES.map((family) => <option key={family} value={family}>{family.replaceAll("_", " ")}</option>)}
          </select>
          <input aria-label="Confidence" type="number" min="0" max="100" value={draft.confidence} onChange={(event) => setDraft({ ...draft, confidence: event.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <button type="button" onClick={addEvidence} className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">Add reviewed evidence</button>
        {evidenceError ? <p className="mt-2 text-sm text-red-700">{evidenceError}</p> : null}
        <div className="mt-4 space-y-2">
          {evidence.length === 0 ? <p className="text-sm text-slate-500">No reviewed evidence yet.</p> : evidence.map((item, index) => (
            <div key={`${item.sourceUrl}:${index}`} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.candidateName}</p><p className="text-sm text-slate-600">{item.sourceTitle}</p></div><button type="button" onClick={() => setEvidence((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-slate-500">Remove</button></div>
              <p className="mt-2 break-all text-xs text-slate-500">{item.sourceUrl}</p>
              <p className="mt-1 text-xs text-slate-500">{item.signalFamily} · {item.signalType} · confidence {item.confidence ?? "not stated"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-5">
        <h2 className="text-lg font-semibold">3. Intelligence gates</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium">Identity
            <select value={identityResolution} onChange={(event) => setIdentityResolution(event.target.value as IdentityResolutionState)} className="mt-1 w-full rounded-md border px-3 py-2 font-normal"><option value="UNRESOLVED">Unresolved</option><option value="CANDIDATE">Candidate match</option><option value="CONFIRMED">Confirmed</option></select>
          </label>
          <label className="text-sm font-medium">Compliance
            <select value={complianceState} onChange={(event) => setComplianceState(event.target.value as ComplianceState)} className="mt-1 w-full rounded-md border px-3 py-2 font-normal"><option value="REVIEW_REQUIRED">Review required</option><option value="CLEAR">Clear</option><option value="BLOCKED">Blocked</option></select>
          </label>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"><input type="checkbox" checked={suppressionMatched} onChange={(event) => setSuppressionMatched(event.target.checked)} /> Suppression match</label>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div><p className="text-xs uppercase text-slate-500">Opportunity</p><p className="mt-1 text-2xl font-semibold">{decision.opportunity.classification}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Score</p><p className="mt-1 text-2xl font-semibold">{decision.opportunity.score}/100</p></div>
          <div><p className="text-xs uppercase text-slate-500">Next best action</p><p className="mt-1 font-semibold">{decision.nextBestAction.replaceAll("_", " ")}</p></div>
          <div><p className="text-xs uppercase text-slate-500">CRM promotion</p><p className="mt-1 font-semibold">{decision.promotionStatus.replaceAll("_", " ")}</p></div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><p className="text-sm font-semibold">Why FEH reached this result</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{decision.opportunity.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
          <div><p className="text-sm font-semibold">Safety and progression gates</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{decision.promotionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
        </div>
        <div className="mt-4 rounded-md border border-emerald-300 bg-white p-3 text-sm"><strong>Phase 3 boundary:</strong> outreach allowed = no · CRM write performed = no · execution performed = no.</div>
      </section>
    </div>
  );
}
