"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import {
  addCaseNote,
  casePriorityFromDays,
  casePriorityTone,
  deriveNextRecommendedAction,
  toggleChecklistItem,
  updateCaseStatus,
} from "@/lib/renewals/case-engine";
import {
  RENEWAL_CASE_STATUSES,
  RENEWAL_CHECKLIST_ITEMS,
  type RenewalCase,
  type RenewalCaseStatus,
  type RenewalChecklistItem,
} from "@/lib/renewals/case-types";
import {
  formatDisplayDate,
  formatEac,
  formatGbp,
} from "@/lib/renewals/demo-data";
import type { DemoRenewalRecord } from "@/lib/renewals/types";

import { riskLevelTone } from "./RenewalUrgencyBadge";

type StartRenewalModalProps = {
  record: DemoRenewalRecord;
  existingCase: RenewalCase | null;
  onCreateCase: () => void;
  onUpdateCase: (next: RenewalCase) => void;
  onClose: () => void;
};

export function StartRenewalModal({
  record,
  existingCase,
  onCreateCase,
  onUpdateCase,
  onClose,
}: StartRenewalModalProps) {
  const titleId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const wide = Boolean(existingCase);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {existingCase ? (
          <RenewalCaseWorkspace
            renewalCase={existingCase}
            onUpdate={onUpdateCase}
            onClose={onClose}
          />
        ) : (
          <StartRenewalIntro
            titleId={titleId}
            record={record}
            onCreateCase={onCreateCase}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function StartRenewalIntro({
  titleId,
  record,
  onCreateCase,
  onClose,
}: {
  titleId: string;
  record: DemoRenewalRecord;
  onCreateCase: () => void;
  onClose: () => void;
}) {
  const previewPriority = casePriorityFromDays(record.daysUntilEnd);

  return (
    <>
      <header className="border-b border-slate-200 px-6 py-5">
        <p className="text-sm font-semibold text-emerald-600">Renewal workflow</p>
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          Start Renewal
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {record.customerName} · {record.siteName}
        </p>
      </header>

      <div className="space-y-6 px-6 py-5">
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Create a renewal case to track checklist progress, status, notes, and activity in this
          session. Data is not persisted to Supabase yet.
        </p>

        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer name" value={record.customerName} />
          <Field label="Site" value={record.siteName} />
          <Field label="Current supplier" value={record.supplier} />
          <Field label="Contract end date" value={formatDisplayDate(record.contractEnd)} />
          <Field label="Estimated annual consumption (EAC)" value={formatEac(record.estimatedAnnualConsumptionKwh)} />
          <Field
            label="Estimated annual contract value (EACV)"
            value={`${formatGbp(record.estimatedAnnualContractValueGbp)} (demo)`}
          />
          <Field
            label="Estimated commission"
            value={`${formatGbp(record.estimatedBrokerCommissionGbp)} (demo)`}
          />
          <Field label="Account manager" value={record.accountManager} />
          <Field label="Days remaining" value={String(record.daysUntilEnd)} />
          <Field label="Priority (on create)" value={previewPriority} />
          <Field
            label="Current risk"
            value={
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${riskLevelTone(record.riskLevel)}`}
              >
                {record.riskLevel} ({record.customerRiskScore})
              </span>
            }
          />
          <Field label="Last contact date" value={formatDisplayDate(record.lastContact)} />
        </dl>
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={onCreateCase}
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Create renewal case
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Close
        </button>
      </footer>
    </>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function RenewalCaseWorkspace({
  renewalCase,
  onUpdate,
  onClose,
}: {
  renewalCase: RenewalCase;
  onUpdate: (next: RenewalCase) => void;
  onClose: () => void;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  const [strategyVisible, setStrategyVisible] = useState(false);
  const recommendation = deriveNextRecommendedAction(renewalCase);

  function handleChecklistClick(item: RenewalChecklistItem) {
    onUpdate(toggleChecklistItem(renewalCase, item));
  }

  function handleStatusChange(status: RenewalCaseStatus) {
    onUpdate(updateCaseStatus(renewalCase, status));
  }

  function handleAddNote() {
    const next = addCaseNote(renewalCase, noteDraft);
    if (next) {
      onUpdate(next);
      setNoteDraft("");
    }
  }

  const completedCount = RENEWAL_CHECKLIST_ITEMS.filter(
    (item) => renewalCase.checklist[item],
  ).length;

  return (
    <>
      <header className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Renewal case workspace</p>
            <h2 className="text-xl font-bold text-slate-900">{renewalCase.caseId}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {renewalCase.customerName} · {renewalCase.siteName}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${casePriorityTone(renewalCase.priority)}`}
          >
            {renewalCase.priority} priority
          </span>
        </div>
      </header>

      <div className="space-y-6 px-6 py-5">
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Demo case data — stored in browser session state only (not saved to Supabase).
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Case details" description="Snapshot from renewals register">
            <dl className="grid gap-3 sm:grid-cols-2">
              <CaseDetailField label="Renewal case ID" value={renewalCase.caseId} />
              <CaseDetailField label="Date created" value={renewalCase.dateCreatedLabel} />
              <CaseDetailField label="Customer name" value={renewalCase.customerName} />
              <CaseDetailField label="Site" value={renewalCase.siteName} />
              <CaseDetailField label="Current supplier" value={renewalCase.currentSupplier} />
              <CaseDetailField
                label="Contract end date"
                value={formatDisplayDate(renewalCase.contractEndDate)}
              />
              <CaseDetailField
                label="Estimated annual consumption (EAC)"
                value={formatEac(renewalCase.estimatedAnnualConsumptionKwh)}
              />
              <CaseDetailField
                label="Estimated annual contract value (EACV)"
                value={`${formatGbp(renewalCase.estimatedAnnualContractValueGbp)} (demo)`}
              />
              <CaseDetailField
                label="Estimated commission"
                value={`${formatGbp(renewalCase.estimatedCommissionGbp)} (demo)`}
              />
              <CaseDetailField label="Account manager" value={renewalCase.accountManager} />
              <CaseDetailField label="Priority" value={renewalCase.priority} />
              <CaseDetailField label="Status" value={renewalCase.status} />
              <CaseDetailField label="Days remaining" value={String(renewalCase.daysRemaining)} />
              <CaseDetailField
                label="Last contact date"
                value={formatDisplayDate(renewalCase.lastContactDate)}
              />
            </dl>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Case status" description="Update renewal pipeline stage">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="case-status">
                Status
              </label>
              <select
                id="case-status"
                value={renewalCase.status}
                onChange={(event) =>
                  handleStatusChange(event.target.value as RenewalCaseStatus)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
              >
                {RENEWAL_CASE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </SectionCard>

            <SectionCard
              title="Next recommended action"
              description="Based on days remaining, last contact, and checklist progress"
            >
              <p className="font-semibold text-slate-900">{recommendation.title}</p>
              <p className="mt-2 text-sm text-slate-600">{recommendation.detail}</p>
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title="Renewal progress checklist"
          description={`${completedCount} of ${RENEWAL_CHECKLIST_ITEMS.length} complete — click to toggle`}
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {RENEWAL_CHECKLIST_ITEMS.map((item) => {
              const complete = renewalCase.checklist[item];
              return (
                <li key={item}>
                  <button
                    type="button"
                    aria-pressed={complete}
                    onClick={() => handleChecklistClick(item)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      complete
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        complete ? "bg-emerald-500 text-white" : "border border-slate-300 text-slate-400"
                      }`}
                      aria-hidden
                    >
                      {complete ? "✓" : ""}
                    </span>
                    <span>
                      <span className="font-semibold">{item}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {complete ? "Completed" : "Outstanding"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Activity timeline" description="Case events in this session">
            {renewalCase.timeline.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {renewalCase.timeline.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-slate-500">{entry.occurredLabel}</p>
                    <p className="mt-1 text-sm text-slate-800">{entry.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Broker notes" description="Add notes to the case timeline">
            <label className="sr-only" htmlFor="renewal-case-note">
              Note
            </label>
            <textarea
              id="renewal-case-note"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={4}
              placeholder="Add renewal context, call outcomes, or next steps…"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800"
            />
            <button
              type="button"
              onClick={handleAddNote}
              className="mt-3 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Add Note
            </button>
            {renewalCase.notes.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {renewalCase.notes.map((note) => (
                  <li key={note.id} className="text-sm text-slate-700">
                    <span className="text-xs font-semibold text-slate-400">{note.createdLabel}</span>
                    <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {strategyVisible && (
          <section
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4"
            aria-live="polite"
          >
            <h3 className="text-sm font-bold text-emerald-900">AI renewal strategy (demo)</h3>
            <p className="mt-2 text-sm text-emerald-950">{renewalCase.aiRecommendationDemo}</p>
          </section>
        )}
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <WorkflowActionComingSoon title="Opportunity module">
          Create Opportunity
        </WorkflowActionComingSoon>

        {renewalCase.customerId ? (
          <Link
            href={`/customers/${renewalCase.customerId}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Open Customer 360
          </Link>
        ) : (
          <WorkflowActionComingSoon title="No CRM customer linked on this demo row">
            Open Customer 360
          </WorkflowActionComingSoon>
        )}

        <button
          type="button"
          onClick={() => setStrategyVisible(true)}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
        >
          Generate AI Renewal Strategy
        </button>

        <WorkflowActionComingSoon title="Automated task list">
          Create Task List
        </WorkflowActionComingSoon>

        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Close
        </button>
      </footer>
    </>
  );
}

function CaseDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function WorkflowActionComingSoon({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="cursor-not-allowed rounded-xl border border-dashed border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400"
    >
      {children} — Coming Soon
    </span>
  );
}
