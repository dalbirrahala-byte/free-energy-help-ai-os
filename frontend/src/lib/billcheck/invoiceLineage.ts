import type { BillDocument, BillCheckFinding } from "./billCheck.ts";

export type InvoiceLineage = Readonly<{
  rootDocumentId: string;
  documentIds: readonly string[];
  netPence: number;
  findings: readonly BillCheckFinding[];
}>;

function byId(documents: readonly BillDocument[]): Map<string, BillDocument> {
  const map = new Map<string, BillDocument>();
  for (const doc of documents) {
    if (!doc.id || map.has(doc.id)) throw new Error("duplicate_document_id");
    map.set(doc.id, doc);
  }
  return map;
}

function rootOf(doc: BillDocument, docs: Map<string, BillDocument>): string {
  let current = doc;
  const visited = new Set<string>();
  while (current.replacesId || current.reversesId) {
    if (visited.has(current.id)) throw new Error("lineage_cycle");
    visited.add(current.id);
    const parentId = current.replacesId ?? current.reversesId!;
    const parent = docs.get(parentId);
    if (!parent) return parentId;
    current = parent;
  }
  return current.id;
}

/**
 * Reconstruct invoice genealogy without assuming that a credit note has fixed
 * the customer's account. Missing parents and ambiguous credit notes remain
 * explicit review findings.
 */
export function buildInvoiceLineages(documents: readonly BillDocument[]): readonly InvoiceLineage[] {
  const docs = byId(documents);
  const grouped = new Map<string, BillDocument[]>();

  for (const doc of documents) {
    const root = rootOf(doc, docs);
    const list = grouped.get(root) ?? [];
    list.push(doc);
    grouped.set(root, list);
  }

  const results: InvoiceLineage[] = [];
  for (const [rootDocumentId, members] of grouped) {
    const findings: BillCheckFinding[] = [];
    const memberIds = new Set(members.map(d => d.id));

    for (const doc of members) {
      const parentId = doc.replacesId ?? doc.reversesId;
      if (parentId && !docs.has(parentId)) {
        findings.push(Object.freeze({
          code: "MISSING_LINEAGE_PARENT",
          confidence: "D_UNRESOLVED",
          status: "REVIEW_REQUIRED",
          explanation: "A credit, reversal or rebill references a document that is not present. The lineage cannot be proven complete.",
          evidenceIds: Object.freeze([doc.id, parentId]),
        }));
      }
      if (doc.kind === "CREDIT_NOTE" && !parentId) {
        findings.push(Object.freeze({
          code: "UNALLOCATED_CREDIT",
          confidence: "D_UNRESOLVED",
          status: "REVIEW_REQUIRED",
          explanation: "A credit note exists but the corrected invoice is not identified. Do not assume the credit has repaired the account.",
          evidenceIds: Object.freeze([doc.id]),
        }));
      }
    }

    const netPence = members.reduce((sum, d) => sum + d.grossPence, 0);
    results.push(Object.freeze({
      rootDocumentId,
      documentIds: Object.freeze([...memberIds]),
      netPence,
      findings: Object.freeze(findings),
    }));
  }

  return Object.freeze(results);
}
