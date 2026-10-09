import assert from "node:assert/strict";
import test from "node:test";
import { isAnchorRead, netDocumentLiability, readingEvidenceRank, reconstructAnchorConsumption, validateBillHistory } from "./billCheck.ts";

test("later actual evidence outranks estimate and forces retrospective reconciliation", () => {
  const result = validateBillHistory({
    documents:[{id:"INV-1",kind:"ORIGINAL",issuedAt:"2026-02-02",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:500000}],
    reads:[
      {id:"R1",meterSerial:"M1",readAt:"2026-01-01",value:10000,kind:"ACTUAL_SITE"},
      {id:"E1",meterSerial:"M1",readAt:"2026-02-01",value:14300,kind:"ESTIMATE"},
      {id:"R2",meterSerial:"M1",readAt:"2026-03-01",value:13850,kind:"ACTUAL_SITE"},
    ],
  });
  assert.equal(result.anchorPeriods[0].consumption,3850);
  assert.equal(result.findings[0].code,"ESTIMATE_REQUIRES_RETROSPECTIVE_RECONCILIATION");
  assert.ok(readingEvidenceRank("ACTUAL_SITE") > readingEvidenceRank("CUSTOMER"));
  assert.ok(readingEvidenceRank("CUSTOMER") > readingEvidenceRank("ESTIMATE"));
});

test("credit and rebill are netted rather than summed as customer liability", () => {
  assert.equal(netDocumentLiability([
    {id:"A",kind:"ORIGINAL",issuedAt:"2026-01-31",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:500000},
    {id:"B",kind:"CREDIT_NOTE",issuedAt:"2026-02-05",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:-500000,reversesId:"A"},
    {id:"C",kind:"REBILL",issuedAt:"2026-02-05",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:470000,replacesId:"A"},
  ]),470000);
});

test("unlinked credit note is review-required rather than assumed applied", () => {
  const result=validateBillHistory({
    documents:[
      {id:"A",kind:"ORIGINAL",issuedAt:"2026-01-31",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:500000},
      {id:"B",kind:"CREDIT_NOTE",issuedAt:"2026-02-05",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:-500000},
    ],
    reads:[],
  });
  assert.equal(result.findings[0].code,"UNLINKED_CREDIT_NOTE");
  assert.equal(result.findings[0].confidence,"D_UNRESOLVED");
});

test("different meter serials are separate epochs and never bridged", () => {
  const periods=reconstructAnchorConsumption([
    {id:"O1",meterSerial:"OLD",readAt:"2026-01-01",value:80000,kind:"OPENING"},
    {id:"F1",meterSerial:"OLD",readAt:"2026-02-01",value:84216,kind:"FINAL"},
    {id:"O2",meterSerial:"NEW",readAt:"2026-02-01",value:0,kind:"METER_EXCHANGE"},
    {id:"A2",meterSerial:"NEW",readAt:"2026-03-01",value:437,kind:"ACTUAL_SITE"},
  ]);
  assert.deepEqual(periods.map(p=>[p.meterSerial,p.consumption]),[["OLD",4216],["NEW",437]]);
});

test("duplicate invoice IDs fail closed", () => {
  const doc={id:"A",kind:"ORIGINAL" as const,issuedAt:"2026-01-31",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:500000};
  assert.throws(()=>netDocumentLiability([doc,doc]),/duplicate_document_id/);
});

test("money uses integer pence and invalid periods fail closed", () => {
  assert.throws(()=>netDocumentLiability([{id:"A",kind:"ORIGINAL",issuedAt:"2026-01-31",periodStart:"2026-02-01",periodEnd:"2026-01-01",grossPence:1}]),/invalid_period/);
  assert.throws(()=>netDocumentLiability([{id:"B",kind:"ORIGINAL",issuedAt:"2026-01-31",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:1.5}]),/non_integer_money/);
});

test("estimate is not an anchor", () => {
  assert.equal(isAnchorRead({id:"E",meterSerial:"M",readAt:"2026-01-01",value:1,kind:"ESTIMATE"}),false);
  assert.equal(isAnchorRead({id:"A",meterSerial:"M",readAt:"2026-01-01",value:1,kind:"ACTUAL_SITE"}),true);
});

test("absence of proof never becomes a claim that the supplier is correct", () => {
  const result=validateBillHistory({documents:[],reads:[]});
  assert.equal(result.findings[0].code,"NO_PROVEN_VARIANCE");
  assert.equal(result.findings[0].confidence,"E_INSUFFICIENT");
  assert.equal(result.findings[0].status,"REVIEW_REQUIRED");
});
