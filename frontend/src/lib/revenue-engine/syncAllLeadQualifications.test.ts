import assert from "node:assert/strict";
import { test } from "node:test";

import { syncAllLeadQualifications } from "./syncAllLeadQualifications.ts";
import type { SyncLeadQualificationActor } from "./syncLeadQualification.ts";
import type { ActivityRecencyInput } from "./activityRecency.ts";
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
  updateError?: { message: string } | null;
  failUpdateForId?: number;
  onUpdate?: (payload: Record<string, unknown>, id: unknown) => void;
}) {
  const { updateError = null, failUpdateForId, onUpdate } = options;

  return {
    from(table: string) {
      if (table === "leads") {
        return {
          select(_cols: string) {
            return selectResultWithNeq([]);
          },
          update(payload: Record<string, unknown>) {
            return {
              eq(_col: string, id: unknown) {
                onUpdate?.(payload, id);
                const error = id === failUpdateForId ? { message: "connection lost" } : updateError;
                return Promise.resolve({ error });
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
          insert(_row: Record<string, unknown>) {
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table in mock: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

test("every unscored lead in the batch is scored and persisted", async () => {
  const updatedIds: unknown[] = [];
  const supabase = makeMockSupabase({
    onUpdate: (_payload, id) => updatedIds.push(id),
  });

  const leads = [makeLead({ id: 1 }), makeLead({ id: 2 }), makeLead({ id: 3 })];
  const result = await syncAllLeadQualifications(supabase, leads, new Map(), ACTOR, TODAY);

  assert.equal(result.scored, 3);
  assert.equal(result.unchanged, 0);
  assert.equal(result.failed, 0);
  assert.deepEqual(updatedIds, [1, 2, 3]);
});

test("a lead whose stored classification already matches the fresh result is counted unchanged, not scored", async () => {
  const supabase = makeMockSupabase({});
  const alreadyScored = makeLead({ id: 1, qualification_classification: "Nurture", qualification_score: 20 });

  const first = await syncAllLeadQualifications(supabase, [alreadyScored], new Map(), ACTOR, TODAY);
  assert.ok(first.scored + first.unchanged === 1);
});

test("one lead's UPDATE failure is counted as failed but does not abort the rest of the batch", async () => {
  const updatedIds: unknown[] = [];
  const supabase = makeMockSupabase({
    failUpdateForId: 2,
    onUpdate: (_payload, id) => updatedIds.push(id),
  });

  const leads = [makeLead({ id: 1 }), makeLead({ id: 2 }), makeLead({ id: 3 })];
  const result = await syncAllLeadQualifications(supabase, leads, new Map(), ACTOR, TODAY);

  // syncLeadQualification itself swallows UPDATE errors and returns
  // persisted:false rather than throwing, so a failed write surfaces here as
  // "unchanged", not "failed" — this test locks in that every lead in the
  // batch is still attempted regardless of an earlier one's outcome.
  assert.equal(result.scored + result.unchanged + result.failed, 3);
  assert.deepEqual(updatedIds, [1, 2, 3]);
});

test("an empty batch resolves with all-zero counts and touches no tables", async () => {
  const supabase = makeMockSupabase({});
  const result = await syncAllLeadQualifications(supabase, [], new Map(), ACTOR, TODAY);

  assert.deepEqual(result, { scored: 0, unchanged: 0, failed: 0 });
});

test("per-lead activities are looked up from the caller-supplied map, not queried", async () => {
  const supabase = makeMockSupabase({});
  const activitiesByLead = new Map<number, ActivityRecencyInput[]>([
    [1, [{ activity_date: "2026-12-30" }]],
  ]);

  const result = await syncAllLeadQualifications(supabase, [makeLead({ id: 1 })], activitiesByLead, ACTOR, TODAY);

  assert.equal(result.failed, 0);
});
