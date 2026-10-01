# FEH Quantum Procurement Lab — claim/evidence register

**INTERNAL — NOT FOR PUBLICATION WITHOUT REVIEW — 1 October 2026**

Purpose: keep every public-facing Quantum Lab statement tied to retained evidence and prevent overclaiming.

| Proposed statement | Evidence status | Permitted wording | Prohibited extension |
|---|---|---|---|
| FEH ran a synthetic six-site procurement optimisation experiment on real IBM Quantum hardware | Supported by retained experiment record | "FEH completed an exploratory synthetic procurement-optimisation experiment using IBM Quantum hardware." | Do not say production customer workload, commercial deployment or IBM validation |
| Backend was `ibm_marrakesh` | Supported by retained job record | Name backend factually as hardware used in the retained run | Do not imply continuing access, exclusivity, current availability or IBM partnership |
| 1,024 measurements/shots were taken | Supported by retained run record | "1,024 measured outcomes" / "1,024 shots" | Do not convert this into statistical significance without a defined analysis |
| Exact classical optimum score was 17.00 | Supported by frozen benchmark record | State as the benchmark for the retained synthetic objective | Do not imply the objective is a real tariff/customer cost model |
| Exact optimum appeared 228 times (22.2656%) and ranked second by frequency | Supported by retained result | State exact count/rate/rank for this run | Do not generalise to expected future hardware performance |
| Modal hardware candidate appeared 247 times (~24.12%) with objective 17.04 | Supported by retained result | State with "about 24.12%" and note it was slightly worse than the benchmark | Do not call the modal candidate optimal |
| IBM job record reported two seconds of QPU usage | Supported by retained job metadata | "The retained job record reported two seconds of QPU usage." | Do not describe this as total elapsed time, total compute cost or end-to-end runtime |
| Experiment demonstrates feasibility of FEH's end-to-end research workflow | Supported, narrowly | "Technical feasibility milestone" / "end-to-end workflow operated" | Do not say quantum advantage, commercial superiority or production readiness |
| Quantum method found the classical optimum in the sample distribution | Supported for this single run | Say the optimum was observed and report rank/hit rate | Do not say the quantum method solved the problem better or faster than classical optimisation |
| Result proves customer savings / lower supplier prices | **Not supported** | None | Prohibited |
| Result proves quantum advantage / speed-up | **Not supported** | None | Prohibited |
| IBM endorses, partners with or validates FEH | **Not supported** | IBM may be named only as hardware/service provider | Prohibited |
| Result is commercially production-ready | **Not supported** | None | Prohibited |
| Result scales to live multi-site procurement | **Not supported** | May describe this as a future research question only | Prohibited |

## Publication gate

Before any Lab page, press release, pitch, social post or investor material uses the experiment:
1. Check every quantitative statement against the retained run record.
2. Keep synthetic-data and non-production wording adjacent to the result.
3. Keep the classical benchmark visible.
4. Preserve the distinction between QPU usage and end-to-end elapsed time.
5. Re-check IBM terminology if software/interface names are mentioned.
6. Reject any wording that implies IBM endorsement, quantum advantage, customer savings or production readiness without new evidence.

## Current IBM terminology note

IBM Quantum Compute client 0.50.0 release notes dated 24 September 2026 state that `EstimatorV2` and `SamplerV2` are deprecated in favour of newer client-side `Estimator` and `Sampler` implementations. This affects reproducibility wording for future repeats, not the facts retained from the completed hardware job.

Reference: https://quantum.cloud.ibm.com/docs/en/api/qiskit-ibm-runtime/release-notes
