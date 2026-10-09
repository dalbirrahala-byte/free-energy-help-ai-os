import assert from "node:assert/strict";
import test from "node:test";
import { buildInvoiceLineages } from "./invoiceLineage.ts";

test("original credit and rebill form one lineage with the true net", () => {
  const [lineage] = buildInvoiceLineages([
    {id:"INV-1",kind:"ORIGINAL",issuedAt:"2026-01-31",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:500000},
    {id:"CR-1",kind:"CREDIT_NOTE",issuedAt:"2026-02-05",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:-500000,reversesId:"INV-1"},
    {id:"REBILL-1",kind:"REBILL",issuedAt:"2026-02-05",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:470000,replacesId:"INV-1"},
  ]);
  assert.equal(lineage.rootDocumentId,"INV-1");
  assert.equal(lineage.netPence,470000);
  assert.deepEqual(new Set(lineage.documentIds),new Set(["INV-1","CR-1","REBILL-1"]));
  assert.equal(lineage.findings.length,0);
});

test("partial credit and adjustment remain mathematically visible", () => {
  const [lineage]=buildInvoiceLineages([
    {id:"INV",kind:"ORIGINAL",issuedAt:"2026-01-31",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:843000},
    {id:"CR",kind:"CREDIT_NOTE",issuedAt:"2026-02-05",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:-210000,reversesId:"INV"},
    {id:"ADJ",kind:"ADJUSTMENT",issuedAt:"2026-02-06",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:174000,replacesId:"INV"},
  ]);
  assert.equal(lineage.netPence,807000);
});

test("unallocated credit is not assumed to repair a bill", () => {
  const lineages=buildInvoiceLineages([
    {id:"INV",kind:"ORIGINAL",issuedAt:"2026-01-31",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:500000},
    {id:"CR",kind:"CREDIT_NOTE",issuedAt:"2026-02-05",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:-500000},
  ]);
  const credit=lineages.find(x=>x.rootDocumentId==="CR")!;
  assert.equal(credit.findings[0].code,"UNALLOCATED_CREDIT");
  assert.equal(credit.findings[0].confidence,"D_UNRESOLVED");
});

test("missing referenced invoice remains explicit evidence gap", () => {
  const [lineage]=buildInvoiceLineages([
    {id:"CR",kind:"CREDIT_NOTE",issuedAt:"2026-02-05",periodStart:"2026-01-01",periodEnd:"2026-01-31",grossPence:-500000,reversesId:"MISSING"},
  ]);
  assert.equal(lineage.rootDocumentId,"MISSING");
  assert.equal(lineage.findings[0].code,"MISSING_LINEAGE_PARENT");
});

test("cycles fail closed", () => {
  assert.throws(()=>buildInvoiceLineages([
    {id:"A",kind:"REBILL",issuedAt:"2026-01-01",periodStart:"2026-01-01",periodEnd:"2026-01-01",grossPence:1,replacesId:"B"},
    {id:"B",kind:"REBILL",issuedAt:"2026-01-01",periodStart:"2026-01-01",periodEnd:"2026-01-01",grossPence:1,replacesId:"A"},
  ]),/lineage_cycle/);
});
