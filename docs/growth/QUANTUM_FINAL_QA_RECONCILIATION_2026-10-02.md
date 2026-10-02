# FEH Quantum Procurement Lab — final QA reconciliation

Date: 2 October 2026  
Status: INTERNAL / HOLD / DO NOT PUBLISH / DO NOT SEND

## Cross-artifact consistency result

The current branch was re-read across:
- public Lab-page draft;
- IBM one-page use-case brief;
- press-release draft v2;
- claim/evidence register;
- reproducibility summary;
- PR/backlink shortlist.

The controlled quantitative facts are consistent across the evidence-bearing documents:

- synthetic problem size: six sites;
- classical optimum objective: 17.00;
- hardware measurements: 1,024;
- exact optimum observations: 228 / 1,024 = 22.2656%;
- exact optimum frequency rank: second;
- modal candidate observations: 247 / 1,024, about 24.12%;
- modal candidate objective: 17.04;
- backend recorded: `ibm_marrakesh`;
- retained IBM job metadata: two seconds of QPU usage.

The public Lab draft, press release, claim/evidence register and reproducibility summary correctly constrain the interpretation to technical feasibility and explicitly reject quantum-advantage, customer-savings, commercial-superiority, production-readiness and IBM-endorsement claims.

## Remaining wording defect

The IBM one-page use-case brief still contains two broader phrases:

1. "Reported compute usage for the run was two seconds."
2. "compute usage" in the proposed next-study metric.

These should be narrowed to:

1. "The retained IBM job record reported two seconds of QPU usage for the run."
2. "QPU usage" in the proposed next-study metric.

Reason: the retained evidence supports QPU-usage metadata, not total elapsed time, total compute time or end-to-end runtime.

## Reproducibility note

IBM Quantum Compute client 0.50.0 was released on 24 September 2026 and deprecated `EstimatorV2` and `SamplerV2` in favour of newer client-side `Estimator` and `Sampler` interfaces. Future repeats using the newer interfaces must be recorded as a protocol-version change rather than silently treated as identical to the retained run.

Reference:
https://quantum.cloud.ibm.com/docs/en/api/qiskit-ibm-runtime/release-notes

## Publication gate

The pack is not publication-ready until the two one-page wording corrections above are reconciled. No public page, press release, social post or media pitch should be released from this branch before that correction and human commercial/legal review.

This note does not authorize publication, outreach, IBM contact, media contact, production deployment or any claim beyond the existing claim/evidence register.
