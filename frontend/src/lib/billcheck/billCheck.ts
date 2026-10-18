export type BillDocumentKind =
  | "ORIGINAL"
  | "CREDIT_NOTE"
  | "REBILL"
  | "REVERSAL"
  | "ADJUSTMENT";

export type ReadEvidenceKind =
  | "ACTUAL_SITE"
  | "AMR_SMART"
  | "HH"
  | "CUSTOMER"
  | "OPENING"
  | "FINAL"
  | "METER_EXCHANGE"
  | "ESTIMATE"
  | "PRORATED"
  | "UNKNOWN";

export type ConfidenceGrade = "A_PROVEN" | "B_HIGH" | "C_PROBABLE" | "D_UNRESOLVED" | "E_INSUFFICIENT";

export type BillDocument = Readonly<{
  id: string;
  kind: BillDocumentKind;
  issuedAt: string;
  periodStart: string;
  periodEnd: string;
  grossPence: number;
  replacesId?: string | null;
  reversesId?: string | null;
}>;

export type MeterRead = Readonly<{
  id: string;
  meterSerial: string;
  readAt: string;
  value: number;
  kind: ReadEvidenceKind;
}>;

export type BillCheckFinding = Readonly<{
  code: string;
  confidence: ConfidenceGrade;
  status: "VALIDATED" | "DISCREPANCY" | "RECONCILED" | "REVIEW_REQUIRED";
  explanation: string;
  evidenceIds: readonly string[];
}>;

const RELIABLE_ANCHORS = new Set<ReadEvidenceKind>(["ACTUAL_SITE", "AMR_SMART", "HH", "METER_EXCHANGE", "FINAL", "OPENING"]);

function validDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function readingEvidenceRank(kind: ReadEvidenceKind): number {
  switch (kind) {
    case "ACTUAL_SITE": return 100;
    case "HH": return 98;
    case "AMR_SMART": return 96;
    case "METER_EXCHANGE": return 94;
    case "FINAL": return 92;
    case "OPENING": return 90;
    case "CUSTOMER": return 70;
    case "PRORATED": return 35;
    case "ESTIMATE": return 25;
    default: return 0;
  }
}

export function isAnchorRead(read: MeterRead): boolean {
  return RELIABLE_ANCHORS.has(read.kind);
}

export function netDocumentLiability(documents: readonly BillDocument[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const document of documents) {
    if (!document.id || seen.has(document.id)) throw new Error("duplicate_document_id");
    if (!Number.isInteger(document.grossPence)) throw new Error("non_integer_money");
    if (!validDate(document.issuedAt) || !validDate(document.periodStart) || !validDate(document.periodEnd)) throw new Error("invalid_date");
    if (Date.parse(document.periodEnd) < Date.parse(document.periodStart)) throw new Error("invalid_period");
    seen.add(document.id);
    total += document.grossPence;
  }
  return total;
}

export function reconstructAnchorConsumption(reads: readonly MeterRead[]): ReadonlyArray<Readonly<{
  meterSerial: string;
  openingReadId: string;
  closingReadId: string;
  consumption: number;
}>> {
  const byMeter = new Map<string, MeterRead[]>();
  for (const read of reads) {
    if (!read.id || !read.meterSerial || !validDate(read.readAt) || !Number.isFinite(read.value) || read.value < 0) throw new Error("invalid_read");
    const list = byMeter.get(read.meterSerial) ?? [];
    list.push(read);
    byMeter.set(read.meterSerial, list);
  }
  const periods: Array<{meterSerial:string;openingReadId:string;closingReadId:string;consumption:number}> = [];
  for (const [meterSerial, meterReads] of byMeter) {
    const anchors = meterReads.filter(isAnchorRead).sort((a,b) => Date.parse(a.readAt)-Date.parse(b.readAt));
    for (let i=1;i<anchors.length;i++) {
      const opening=anchors[i-1], closing=anchors[i];
      if (closing.value < opening.value) continue; // rollover/exchange needs explicit separate handling.
      periods.push({meterSerial, openingReadId:opening.id, closingReadId:closing.id, consumption:closing.value-opening.value});
    }
  }
  return Object.freeze(periods.map((period) => Object.freeze({ ...period })));
}

export function validateBillHistory(input: {
  documents: readonly BillDocument[];
  reads: readonly MeterRead[];
}): Readonly<{netLiabilityPence:number; anchorPeriods:ReturnType<typeof reconstructAnchorConsumption>; findings:readonly BillCheckFinding[]}> {
  const netLiabilityPence = netDocumentLiability(input.documents);
  const anchorPeriods = reconstructAnchorConsumption(input.reads);
  const findings: BillCheckFinding[] = [];

  const estimates = input.reads.filter(r => r.kind === "ESTIMATE");
  for (const estimate of estimates) {
    const laterAnchor = input.reads
      .filter(r => r.meterSerial === estimate.meterSerial && isAnchorRead(r) && Date.parse(r.readAt) > Date.parse(estimate.readAt))
      .sort((a,b)=>Date.parse(a.readAt)-Date.parse(b.readAt))[0];
    if (laterAnchor) findings.push(Object.freeze({
      code:"ESTIMATE_REQUIRES_RETROSPECTIVE_RECONCILIATION",
      confidence:"B_HIGH",
      status:"REVIEW_REQUIRED",
      explanation:"An estimated reading has a later stronger anchor. Earlier billing must be re-evaluated against the later meter evidence rather than frozen as correct.",
      evidenceIds:Object.freeze([estimate.id,laterAnchor.id]),
    }));
  }

  for (const doc of input.documents) {
    if (doc.kind === "CREDIT_NOTE" && !doc.reversesId && !doc.replacesId) findings.push(Object.freeze({
      code:"UNLINKED_CREDIT_NOTE",
      confidence:"D_UNRESOLVED",
      status:"REVIEW_REQUIRED",
      explanation:"A credit note exists but is not linked to the invoice or rebill it corrects. Do not assume the customer ledger is reconciled.",
      evidenceIds:Object.freeze([doc.id]),
    }));
  }

  if (!findings.length) findings.push(Object.freeze({
    code:"NO_PROVEN_VARIANCE",
    confidence:"E_INSUFFICIENT",
    status:"REVIEW_REQUIRED",
    explanation:"No discrepancy is proven by the supplied evidence alone. More contract, meter or supplier-ledger evidence may be required before stating that the balance is correct or incorrect.",
    evidenceIds:Object.freeze([]),
  }));

  return Object.freeze({netLiabilityPence,anchorPeriods,findings:Object.freeze(findings)});
}
