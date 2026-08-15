import assert from "node:assert/strict";
import { test } from "node:test";

import { syncLeadQualification, type SyncLeadQualificationActor } from "./syncLeadQualification.ts";
import type { CanonicalLead } from "../shared/domain";

const TODAY = new Date(2027, 0, 1);
const ACTOR: SyncLeadQualificationActor = { id: "user-1", role: "manager" };

function makeLead(overrides: Partial<CanonicalLead> = {}): CanonicalLead {
  return {
    id: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    company_name: "Test Co",
    contact_name: "Test Contact",
    telephone: "01234 567890",
    email: "test@example.com",
    supplier: "Test Supplier",
    contract_end: "2027-01-15",
    status: "New",
    notes: null,
    lead_source: "Website",
    source_detail: null,
    source_provenance: "user-entered",
    consent_given: true,
    qualification_classification: null,
    qualification_score: null,
    ...overrides,
  };
}

type MockRow = Record<string, unknown>;

function selectResultWithNeq(rows: MockRow[]) {
  const promise = Promise.resolve({ data: rows, error: null });
  return Object.assign(promise, {
    neq: (_col: string, _val: unknown) => Promise.resolve({ data: rows, error: null }),
  });
}

function makeMockSupabase(options: {
  duplicateRows?: MockRow[];
  updateError?: { message: string } | null;
  onUpdate?: (payload: Record<string, unknown>, id: unknown) => void;
  onAuditInsert?: (row: Record<string, unknown>) => void;
}) {
  const { duplicateRows = [], updateError = null, onUpdate, onAuditInsert } = options;

  return {
    from(table: string) {
      if (table === "leads") {
        return {
          select(_cols: string) {
            return selectResultWithNeq(duplicateRows);
          },
          update(payload: Record<string, unknown>) {
            return {
              eq(_col: string, id: unknown) {
                onUpdate?.(payload, id);
                return Promise.resolve({ error: updateError });
              },
            };
          },
        };
      }
      if (table === "customers") {
        return {
          select(_cols: string) {
            return Promise.resolve({ data: [], error: null });
          },
        };
      }
      if (table === "audit_log") {
        return {
          insert(row: Record<string, unknown>) {
            onAuditInsert?.(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table in mock: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

test("a lead with no prior stored classification is scored and persisted", async () => {
  const captured: { update: Record<string, unknown> | null; audit: Record<string, unknown> | null } = {
    update: null,
    audit: null,
  };
  const supabase = makeMockSupabase({
    onUpdate: (payload) => {
      captured.update = payload;
    },
    onAuditInsert: (row) => {
      captured.audit = row;
    },
  });

  const outcome = await syncLeadQualification(supabase, makeLead(), [], ACTOR, TODAY);

  assert.equal(outcome.persisted, true);
  assert.ok(outcome.result.classification);
  assert.equal(captured.update?.qualification_classification, outcome.result.classification);
  assert.equal(captured.update?.qualification_score, outcome.result.score);
  assert.ok(Array.isArray(captured.update?.qualification_reasons));
  assert.equal(typeof captured.update?.qualification_computed_at, "string");
});

test("an audit event is recorded, attributed to the calling actor, only when the write is persisted", async () => {
  const captured: { audit: Record<string, unknown> | null } = { audit: null };
  const supabase = makeMockSupabase({
    onAuditInsert: (row) => {
      captured.audit = row;
    },
  });

  await syncLeadQualification(supabase, makeLead(), [], ACTOR, TODAY);

  assert.equal(captured.audit?.action, "lead_qualification_scored");
  assert.equal(captured.audit?.actor_id, ACTOR.id);
  assert.equal(captured.audit?.actor_role, ACTOR.role);
  assert.equal(captured.audit?.entity_id, "1");
});

test("recompute is idempotent: an unchanged result performs no UPDATE and no audit write", async () => {
  const firstSupabase = makeMockSupabase({});
  const first = await syncLeadQualification(firstSupabase, makeLead(), [], ACTOR, TODAY);
  assert.equal(first.persisted, true);

  let updateCalled = false;
  let auditCalled = false;
  const secondSupabase = makeMockSupabase({
    onUpdate: () => {
      updateCalled = true;
    },
    onAuditInsert: () => {
      auditCalled = true;
    },
  });

  const leadWithStoredResult = makeLead({
    qualification_classification: first.result.classification,
    qualification_score: first.result.score,
  });

  const second = await syncLeadQualification(secondSupabase, leadWithStoredResult, [], ACTOR, TODAY);

  assert.equal(second.persisted, false);
  assert.equal(updateCalled, false);
  assert.equal(auditCalled, false);
  assert.deepEqual(second.result.classification, first.result.classification);
  assert.deepEqual(second.result.score, first.result.score);
});

test("a stored classification that differs from the freshly computed one triggers a recompute write", async () => {
  let updateCalled = false;
  const supabase = makeMockSupabase({
    onUpdate: () => {
      updateCalled = true;
    },
  });

  const leadWithStaleResult = makeLead({ qualification_classification: "Reject", qualification_score: 0 });
  const outcome = await syncLeadQualification(supabase, leadWithStaleResult, [], ACTOR, TODAY);

  assert.equal(outcome.persisted, true);
  assert.equal(updateCalled, true);
});

test("a failed UPDATE degrades gracefully: returns persisted false, never throws, and records no audit event", async () => {
  let auditCalled = false;
  const supabase = makeMockSupabase({
    updateError: { message: "connection lost" },
    onAuditInsert: () => {
      auditCalled = true;
    },
  });

  const outcomePromise = syncLeadQualification(supabase, makeLead(), [], ACTOR, TODAY);
  await assert.doesNotReject(() => outcomePromise);
  const outcome = await outcomePromise;
  assert.equal(outcome.persisted, false);
  assert.equal(auditCalled, false);
});

test("a structurally unusable lead (no identity) is scored Reject and still persisted", async () => {
  const supabase = makeMockSupabase({});
  const outcome = await syncLeadQualification(
    supabase,
    makeLead({ company_name: null, contact_name: null }),
    [],
    ACTOR,
    TODAY,
  );

  assert.equal(outcome.result.classification, "Reject");
  assert.equal(outcome.persisted, true);
});

test("a confirmed duplicate (matches an existing lead on both email and telephone) is scored Reject", async () => {
  const duplicateRows: MockRow[] = [
    { id: 99, company_name: "Other Co", email: "test@example.com", telephone: "01234 567890", created_at: "2026-01-01T00:00:00.000Z" },
  ];
  const supabase = makeMockSupabase({ duplicateRows });

  const outcome = await syncLeadQualification(supabase, makeLead(), [], ACTOR, TODAY);

  assert.equal(outcome.result.classification, "Reject");
  assert.match(outcome.result.rejectReason ?? "", /confirmed duplicate/);
});

test("identical input on separate calls produces identical classification and score (deterministic)", async () => {
  const supabaseA = makeMockSupabase({});
  const supabaseB = makeMockSupabase({});

  const outcomeA = await syncLeadQualification(supabaseA, makeLead(), [], ACTOR, TODAY);
  const outcomeB = await syncLeadQualification(supabaseB, makeLead(), [], ACTOR, TODAY);

  assert.equal(outcomeA.result.classification, outcomeB.result.classification);
  assert.equal(outcomeA.result.score, outcomeB.result.score);
  assert.deepEqual(outcomeA.result.reasons, outcomeB.result.reasons);
});
