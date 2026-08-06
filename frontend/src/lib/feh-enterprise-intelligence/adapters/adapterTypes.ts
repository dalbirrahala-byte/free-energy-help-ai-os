import type { EvidenceItem, ProvenanceRecord } from "../types";

export type AdapterResult = {
  evidence: EvidenceItem[];
  reasoning: string[];
  recommendation: string;
  missingData: string[];
  provenance: ProvenanceRecord[];
};
