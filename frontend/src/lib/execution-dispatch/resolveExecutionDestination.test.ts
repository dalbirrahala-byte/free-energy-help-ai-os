import assert from "node:assert/strict";
import { test } from "node:test";

import {
  resolveExecutionDestination,
  resolveExecutionDestinationWithLookup,
  type ContactDestinationRecord,
  type DestinationReference,
} from "./resolveExecutionDestination.ts";
import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";

const EVAL_TIME = new Date("2026-08-29T10:00:00.000Z");
const CONTRACT_CREATED_AT = new Date("2026-08-29T09:59:00.000Z").toISOString();

function contract(overrides: Partial<ProviderNeutralDispatchContract> = {}): ProviderNeutralDispatchContract {
  return Object.freeze({
    authorizationRecordId: 1,
    actionId: "action-123",
    idempotencyKey: "idem-key-abc-123",
    contactId: 42,
    channel: "EMAIL",
    policyVersion: "feh-execution-authorization-policy@0.1.0-factory041",
    humanApprovalState: "approved",
    outreachEligibilityStatus: "eligible_for_handoff",
    contractCreatedAt: CONTRACT_CREATED_AT,
    executionPerformed: false,
    ...overrides,
  });
}

function reference(overrides: Partial<DestinationReference> = {}): DestinationReference {
  return Object.freeze({ contactId: 42, channel: "EMAIL", ...overrides });
}

function contactRecord(overrides: Partial<ContactDestinationRecord> = {}): ContactDestinationRecord {
  return Object.freeze({ id: 42, email: "prospect@example.com", phone: "+44 7123 456789", ...overrides });
}

// ---- 1-4. valid contract + matching reference + valid contact destination → destination_ready ----

test("valid EMAIL contract + matching EMAIL reference + valid email → destination_ready", () => {
  const result = resolveExecutionDestination(contract({ channel: "EMAIL" }), reference({ channel: "EMAIL" }), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "destination_ready");
  assert.equal(result.envelope?.destination, "prospect@example.com");
});

test("valid PHONE contract + matching PHONE reference + valid telephone → destination_ready", () => {
  const result = resolveExecutionDestination(contract({ channel: "PHONE" }), reference({ channel: "PHONE" }), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "destination_ready");
  assert.equal(result.envelope?.destination, "+44 7123 456789");
});

test("valid WHATSAPP contract + matching WHATSAPP reference + valid destination → destination_ready", () => {
  const result = resolveExecutionDestination(contract({ channel: "WHATSAPP" }), reference({ channel: "WHATSAPP" }), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "destination_ready");
  assert.equal(result.envelope?.destination, "+44 7123 456789");
});

test("valid SMS contract + matching SMS reference + valid destination → destination_ready", () => {
  const result = resolveExecutionDestination(contract({ channel: "SMS" }), reference({ channel: "SMS" }), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "destination_ready");
  assert.equal(result.envelope?.destination, "+44 7123 456789");
});

// ---- 5-8. channel mismatch → blocked, no fallback ----

test("EMAIL contract + PHONE reference → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "EMAIL" }), reference({ channel: "PHONE" }), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("PHONE contract + EMAIL reference → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "PHONE" }), reference({ channel: "EMAIL" }), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("WHATSAPP contract + SMS reference → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "WHATSAPP" }), reference({ channel: "SMS" }), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("SMS contract + WHATSAPP reference → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "SMS" }), reference({ channel: "WHATSAPP" }), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 9. missing contract → fail closed ----

test("null contract → fail closed, blocked", () => {
  const result = resolveExecutionDestination(null, reference(), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.envelope, null);
});

// ---- 10. malformed contract → fail closed ----

test("malformed contract (blank idempotencyKey) → fail closed", () => {
  const result = resolveExecutionDestination(contract({ idempotencyKey: "" }), reference(), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.envelope, null);
});

test("malformed contract (missing actionId) → fail closed", () => {
  const c = { ...contract(), actionId: null } as unknown as ProviderNeutralDispatchContract;
  const result = resolveExecutionDestination(c, reference(), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 11. executionPerformed true runtime input → fail closed ----

test("contract.executionPerformed not literally false (unsafe cast) → evaluation_failed", () => {
  const c = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const result = resolveExecutionDestination(c, reference(), contactRecord(), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.executionPerformed, false);
});

// ---- 12. missing destination reference → fail closed ----

test("null destinationReference → fail closed", () => {
  const result = resolveExecutionDestination(contract(), null, contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 13. malformed contactId → fail closed ----

test("destinationReference.contactId zero/negative/non-integer → fail closed", () => {
  for (const bad of [0, -1, 1.5]) {
    const result = resolveExecutionDestination(contract(), reference({ contactId: bad }), contactRecord(), EVAL_TIME);
    assert.equal(result.status, "blocked");
  }
});

// ---- 14. invalid destination-reference channel → fail closed ----

test("destinationReference.channel not a recognised channel → fail closed", () => {
  const badReference = { contactId: 42, channel: "CARRIER_PIGEON" } as unknown as DestinationReference;
  const result = resolveExecutionDestination(contract(), badReference, contactRecord(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 15. contact record missing → blocked ----

test("contact record missing (null) → blocked", () => {
  const result = resolveExecutionDestination(contract(), reference(), null, EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 16. requested destination field null → blocked ----

test("EMAIL destination field null → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "EMAIL" }), reference({ channel: "EMAIL" }), contactRecord({ email: null }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("PHONE destination field null → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "PHONE" }), reference({ channel: "PHONE" }), contactRecord({ phone: null }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 17. requested destination field blank → blocked ----

test("EMAIL destination field blank/whitespace-only → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "EMAIL" }), reference({ channel: "EMAIL" }), contactRecord({ email: "   " }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("PHONE destination field blank/whitespace-only → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "PHONE" }), reference({ channel: "PHONE" }), contactRecord({ phone: "   " }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 18. malformed destination → blocked ----

test("malformed email shape → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "EMAIL" }), reference({ channel: "EMAIL" }), contactRecord({ email: "not-an-email" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("malformed telephone shape (too few digits) → blocked", () => {
  const result = resolveExecutionDestination(contract({ channel: "PHONE" }), reference({ channel: "PHONE" }), contactRecord({ phone: "12345" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 19. DB read failure → evaluation_failed ----

test("database read error → evaluation_failed", async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: null, error: { message: "connection reset" } };
                },
              };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const result = await resolveExecutionDestinationWithLookup(supabase, contract(), reference(), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.envelope, null);
});

// ---- 20. no alternate channel fallback ----

test("no alternate channel fallback: WHATSAPP contract never reads an EMAIL-only record's phone via email field", () => {
  // phone is present, email is null -- confirms WHATSAPP resolves phone, never substitutes email.
  const result = resolveExecutionDestination(
    contract({ channel: "WHATSAPP" }),
    reference({ channel: "WHATSAPP" }),
    contactRecord({ email: null, phone: "+44 7123 456789" }),
    EVAL_TIME,
  );
  assert.equal(result.status, "destination_ready");
  assert.equal(result.envelope?.destination, "+44 7123 456789");
});

// ---- 21-24. cross-channel destination substitution never occurs ----

test("EMAIL request cannot use telephone even if email is unavailable", () => {
  const result = resolveExecutionDestination(
    contract({ channel: "EMAIL" }),
    reference({ channel: "EMAIL" }),
    contactRecord({ email: null, phone: "+44 7123 456789" }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

test("PHONE request cannot use email even if telephone is unavailable", () => {
  const result = resolveExecutionDestination(
    contract({ channel: "PHONE" }),
    reference({ channel: "PHONE" }),
    contactRecord({ email: "prospect@example.com", phone: null }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

test("WHATSAPP request cannot use email as a substitute destination", () => {
  const result = resolveExecutionDestination(
    contract({ channel: "WHATSAPP" }),
    reference({ channel: "WHATSAPP" }),
    contactRecord({ email: "prospect@example.com", phone: null }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

test("SMS request cannot use email as a substitute destination", () => {
  const result = resolveExecutionDestination(
    contract({ channel: "SMS" }),
    reference({ channel: "SMS" }),
    contactRecord({ email: "prospect@example.com", phone: null }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// ---- 25-28. exact identifiers preserved ----

test("exact authorizationRecordId preserved on the envelope", () => {
  const result = resolveExecutionDestination(contract({ authorizationRecordId: 999 }), reference(), contactRecord(), EVAL_TIME);
  assert.equal(result.envelope?.authorizationRecordId, 999);
});

test("exact actionId preserved on the envelope", () => {
  const result = resolveExecutionDestination(contract({ actionId: "special-action-id-777" }), reference(), contactRecord(), EVAL_TIME);
  assert.equal(result.envelope?.actionId, "special-action-id-777");
});

test("exact idempotencyKey preserved on the envelope, byte-for-byte", () => {
  const key = "Odd_Format-Key.999-DO-NOT-TOUCH";
  const result = resolveExecutionDestination(contract({ idempotencyKey: key }), reference(), contactRecord(), EVAL_TIME);
  assert.equal(result.envelope?.idempotencyKey, key);
  assert.notEqual(result.envelope?.idempotencyKey, key.toLowerCase());
});

test("exact channel preserved on the envelope", () => {
  const result = resolveExecutionDestination(contract({ channel: "SMS" }), reference({ channel: "SMS" }), contactRecord(), EVAL_TIME);
  assert.equal(result.envelope?.channel, "SMS");
});

// ---- 29-30. no writes ----

test("destination is not persisted/cached anywhere -- envelope is a fresh in-memory object each call", () => {
  const a = resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
  const b = resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
  assert.notEqual(a.envelope, b.envelope);
  assert.deepEqual(a.envelope, b.envelope);
});

test("resolveExecutionDestinationWithLookup performs only a read -- no insert/update/delete/upsert method exists on the mock client", async () => {
  let selectCalled = false;
  const supabase = {
    from(table: string) {
      assert.equal(table, "contacts");
      return {
        select(cols: string) {
          selectCalled = true;
          assert.equal(cols, "id, email, phone");
          return {
            eq(col: string, val: number) {
              assert.equal(col, "id");
              assert.equal(val, 42);
              return {
                async maybeSingle() {
                  return { data: { id: 42, email: "prospect@example.com", phone: "+44 7123 456789" }, error: null };
                },
              };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const result = await resolveExecutionDestinationWithLookup(supabase, contract(), reference(), EVAL_TIME);
  assert.equal(selectCalled, true);
  assert.equal(result.status, "destination_ready");
  assert.equal(typeof supabase.from("contacts").select, "function");
  assert.equal((supabase.from("contacts") as Record<string, unknown>).insert, undefined);
  assert.equal((supabase.from("contacts") as Record<string, unknown>).update, undefined);
  assert.equal((supabase.from("contacts") as Record<string, unknown>).delete, undefined);
  assert.equal((supabase.from("contacts") as Record<string, unknown>).upsert, undefined);
});

// ---- 31. no provider/network call occurs ----

test("resolution resolves near-instantly with no mocked network layer required -- consistent with zero network I/O", () => {
  const started = Date.now();
  resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs < 200, `expected near-instant resolution, took ${elapsedMs}ms`);
});

// ---- 32. no secret/env read occurs ----

test("no environment/provider-secret access occurs", () => {
  const originalEnv = process.env;
  const guardedEnv = new Proxy(
    {},
    {
      get(_target, prop) {
        throw new Error(`Unexpected process.env.${String(prop)} access`);
      },
    },
  );
  // @ts-expect-error -- intentional monkey-patch for the duration of this test only.
  process.env = guardedEnv;
  try {
    const result = resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
    assert.equal(result.status, "destination_ready");
  } finally {
    process.env = originalEnv;
  }
});

// ---- 33-35. immutability ----

test("does not mutate the contract argument", () => {
  const input = contract();
  const snapshot = JSON.parse(JSON.stringify(input));
  resolveExecutionDestination(input, reference(), contactRecord(), EVAL_TIME);
  assert.deepEqual(input, snapshot);
});

test("does not mutate the destinationReference argument", () => {
  const input = reference();
  const snapshot = JSON.parse(JSON.stringify(input));
  resolveExecutionDestination(contract(), input, contactRecord(), EVAL_TIME);
  assert.deepEqual(input, snapshot);
});

test("does not mutate the fetched contact record argument", () => {
  const input = contactRecord();
  const snapshot = JSON.parse(JSON.stringify(input));
  resolveExecutionDestination(contract(), reference(), input, EVAL_TIME);
  assert.deepEqual(input, snapshot);
});

// ---- 36. executionPerformed always false ----

test("executionPerformed is always literally false, on every status", () => {
  const ready = resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
  assert.equal(ready.executionPerformed, false);

  const blocked = resolveExecutionDestination(null, reference(), contactRecord(), EVAL_TIME);
  assert.equal(blocked.executionPerformed, false);

  const failedContract = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const failed = resolveExecutionDestination(failedContract, reference(), contactRecord(), EVAL_TIME);
  assert.equal(failed.executionPerformed, false);
});

// ---- 37. result reasons never include raw destination ----

test("failure reasons never include the raw destination value", () => {
  const result = resolveExecutionDestination(
    contract({ channel: "EMAIL" }),
    reference({ channel: "EMAIL" }),
    contactRecord({ email: "super-secret-address@example.com" }),
    EVAL_TIME,
  );
  // Force a failure on an otherwise-identifiable email to prove it's never echoed.
  const failing = resolveExecutionDestination(
    contract({ channel: "EMAIL" }),
    reference({ channel: "EMAIL" }),
    contactRecord({ email: "not-a-valid-shape" }),
    EVAL_TIME,
  );
  const serialisedReasons = JSON.stringify(failing.reasons);
  assert.equal(serialisedReasons.includes("not-a-valid-shape"), false);
  assert.equal(serialisedReasons.includes("super-secret-address@example.com"), false);
  void result;
});

test("evaluation_failed reasons never include the raw destination value", async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: null, error: { message: "connection reset near prospect@example.com lookup" } };
                },
              };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const result = await resolveExecutionDestinationWithLookup(supabase, contract(), reference(), EVAL_TIME);
  const serialisedReasons = JSON.stringify(result.reasons);
  assert.equal(serialisedReasons.includes("prospect@example.com"), false);
});

// ---- 38. no commercial fields appear ----

test("no opportunity/commercial fields appear anywhere in the result", () => {
  const result = resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
  const serialised = JSON.stringify(result);
  for (const forbidden of ["opportunityScore", "estimatedValue", "commission", "leadPriority", "renewalAttractiveness", "revenueScore", "signalStrength", "fusionScore"]) {
    assert.equal(serialised.includes(forbidden), false);
  }
});

// ---- 39. no FEH FUSION/opportunity signal can override failure ----

test("a blocked resolution stays blocked regardless of how 'ready-looking' every other field is -- no commercial field exists to override it", () => {
  const result = resolveExecutionDestination(
    contract({ channel: "EMAIL", actionId: "high-value-action-999" }),
    reference({ channel: "EMAIL" }),
    contactRecord({ email: null }), // the only failing condition
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.envelope, null);
});

// ---- 40. deterministic pure resolver behavior ----

test("is deterministic: identical input produces identical output", () => {
  const c = contract();
  const r = reference();
  const rec = contactRecord();
  const a = resolveExecutionDestination(c, r, rec, EVAL_TIME);
  const b = resolveExecutionDestination(c, r, rec, EVAL_TIME);
  assert.deepEqual(a, b);
});

// ---- 41. read wrapper is fail-closed ----

test("read wrapper: malformed destinationReference skips the database read entirely and fails closed", async () => {
  let readAttempted = false;
  const supabase = {
    from() {
      readAttempted = true;
      return {
        select() {
          return { eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const result = await resolveExecutionDestinationWithLookup(supabase, contract(), reference({ contactId: -1 }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(readAttempted, false);
});

test("read wrapper: null destinationReference skips the database read entirely and fails closed", async () => {
  let readAttempted = false;
  const supabase = {
    from() {
      readAttempted = true;
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const result = await resolveExecutionDestinationWithLookup(supabase, contract(), null, EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(readAttempted, false);
});

test("read wrapper: zero rows found (clean null read) → blocked, not evaluation_failed", async () => {
  const supabase = {
    from() {
      return {
        select() {
          return { eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const result = await resolveExecutionDestinationWithLookup(supabase, contract(), reference(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- 42. only minimum contact columns are selected ----

test("only 'id, email, phone' columns are ever selected from public.contacts", async () => {
  let selectedColumns: string | null = null;
  const supabase = {
    from(table: string) {
      assert.equal(table, "contacts");
      return {
        select(cols: string) {
          selectedColumns = cols;
          return { eq: () => ({ maybeSingle: async () => ({ data: contactRecord(), error: null }) }) };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  await resolveExecutionDestinationWithLookup(supabase, contract(), reference(), EVAL_TIME);
  assert.equal(selectedColumns, "id, email, phone");
});

// ---- Targeted hardening: contact-id provenance (Phase 11) ----
// Phase 7 execution_authorizations.contact_id -> Phase 8 evidence.contactId
// -> Phase 9 sealed contract.contactId -> Phase 11 exact destination lookup
// for that contactId only.

// 8. Phase 11 resolves using the contactId from the sealed contract.
test("provenance: resolution uses contract.contactId, not an independently supplied value", () => {
  const result = resolveExecutionDestination(contract({ contactId: 42 }), reference({ contactId: 42 }), contactRecord({ id: 42 }), EVAL_TIME);
  assert.equal(result.status, "destination_ready");
  assert.equal(result.envelope?.contactId, 42);
});

// 9. Contact A contract + Contact B destinationReference/contact ID → blocked.
test("provenance: Contact A contract + Contact B destinationReference.contactId → blocked", () => {
  const contactAContract = contract({ contactId: 42 });
  const contactBReference = reference({ contactId: 999 });
  const result = resolveExecutionDestination(contactAContract, contactBReference, contactRecord({ id: 999 }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.envelope, null);
});

// 10. substituted Contact B must NOT cause a database lookup for Contact B.
test("provenance: substituted Contact B reference does not cause a database lookup for Contact B", async () => {
  let lookedUpId: number | null = null;
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq(_col: string, val: number) {
              lookedUpId = val;
              return { maybeSingle: async () => ({ data: contactRecord({ id: val }), error: null }) };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const contactAContract = contract({ contactId: 42 });
  const contactBReference = reference({ contactId: 999 });
  const result = await resolveExecutionDestinationWithLookup(supabase, contactAContract, contactBReference, EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(lookedUpId, null); // no read was ever attempted for Contact B (or anyone)
});

// 11. even if Contact B has a valid destination, Contact A's contract cannot resolve it.
test("provenance: Contact A's contract cannot resolve Contact B's destination even though Contact B's data is perfectly valid", async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq(_col: string, val: number) {
              // Simulates a database that DOES have a valid Contact B row --
              // proves the block is architectural, not because the data was missing.
              return { maybeSingle: async () => ({ data: contactRecord({ id: val, email: "contact-b@example.com" }), error: null }) };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const contactAContract = contract({ contactId: 42, channel: "EMAIL" });
  const contactBReference = reference({ contactId: 999, channel: "EMAIL" });
  const result = await resolveExecutionDestinationWithLookup(supabase, contactAContract, contactBReference, EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.envelope, null);
});

test("provenance: destinationReference.contactId cannot override contract.contactId even when contactRecord matches the reference, not the contract", () => {
  // A pure-function-level adversarial test: contactRecord.id matches destinationReference.contactId (999)
  // but NOT contract.contactId (42) -- must still fail closed.
  const result = resolveExecutionDestination(contract({ contactId: 42 }), reference({ contactId: 999 }), contactRecord({ id: 999 }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.envelope, null);
});

// 12. resolved envelope contactId equals the sealed contract contactId exactly.
test("provenance: resolved envelope.contactId equals contract.contactId exactly", () => {
  const result = resolveExecutionDestination(contract({ contactId: 555 }), reference({ contactId: 555 }), contactRecord({ id: 555 }), EVAL_TIME);
  assert.equal(result.envelope?.contactId, 555);
});

// ---- Additional boundary tests ----

test("mismatched fetched-record id vs contract.contactId → blocked", () => {
  const result = resolveExecutionDestination(contract(), reference({ contactId: 42 }), contactRecord({ id: 999 }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("contract.contactId missing/invalid → blocked", () => {
  for (const bad of [0, -1, 1.5, null]) {
    const c = { ...contract(), contactId: bad } as unknown as ProviderNeutralDispatchContract;
    const result = resolveExecutionDestination(c, reference(), contactRecord(), EVAL_TIME);
    assert.equal(result.status, "blocked");
  }
});

test("envelope is frozen / read-only", () => {
  const result = resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
  assert.equal(Object.isFrozen(result.envelope), true);
});

test("reasons array is always populated", () => {
  const ready = resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
  assert.ok(ready.reasons.length > 0);
  const blocked = resolveExecutionDestination(null, reference(), contactRecord(), EVAL_TIME);
  assert.ok(blocked.reasons.length > 0);
});

test("resolvedAt reflects the supplied evaluation timestamp", () => {
  const result = resolveExecutionDestination(contract(), reference(), contactRecord(), EVAL_TIME);
  assert.equal(result.envelope?.resolvedAt, EVAL_TIME.toISOString());
  assert.equal(result.evaluatedAt, EVAL_TIME.toISOString());
});
