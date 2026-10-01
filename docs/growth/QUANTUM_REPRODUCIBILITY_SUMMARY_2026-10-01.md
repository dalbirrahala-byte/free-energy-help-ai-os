# FEH Quantum Procurement Lab — reproducibility summary

**INTERNAL — 1 October 2026**

## Retained run

- Problem: frozen synthetic six-site commercial-energy procurement optimisation.
- Classical benchmark: exact optimum objective **17.00**.
- Quantum method: one-layer QAOA-style circuit sampled on real IBM Quantum hardware.
- Backend recorded: `ibm_marrakesh`.
- Measurements: **1,024**.
- Exact optimum observations: **228 / 1,024 (22.2656%)**, frequency rank 2.
- Modal candidate observations: **247 / 1,024 (~24.12%)**, objective **17.04**.
- IBM job metadata: **2 seconds QPU usage**.
- Interpretation: feasibility only; no quantum-advantage or commercial-performance claim.

## Minimum repeatability record for every future job

Record before submission:
1. Frozen problem instance identifier and checksum.
2. Objective-function definition, weights and penalty constants.
3. Exact/strong classical baseline implementation and result.
4. QAOA depth/layers, mixer and cost construction.
5. Parameter values and how they were selected.
6. Qiskit and IBM Quantum Compute client package versions.
7. Primitive/interface used and whether it differs from the retained run.
8. Transpilation settings, optimisation level and any fixed seeds.
9. Backend name and relevant backend/calibration snapshot where retrievable.
10. Number of shots and any resilience/error-mitigation settings.

Record after completion:
1. IBM job identifier and timestamps.
2. QPU usage metadata separately from wall-clock duration.
3. Complete measured count distribution or reproducible digest/reference to it.
4. Exact-optimum count, hit rate and frequency rank.
5. Best sampled objective and regret against the classical optimum.
6. Modal sampled candidate and its regret.
7. Circuit depth, two-qubit-gate count and other chosen resource metrics after transpilation.
8. Any warnings, job retries, interface migrations or backend changes.

## Repeat study design

Keep the six-site problem and objective frozen. Run multiple independently submitted jobs under a predeclared protocol before changing problem size. Compare:
- exact-optimum hit-rate distribution;
- exact-optimum rank;
- best-sampled regret;
- modal-candidate regret;
- distribution stability across jobs;
- QPU usage and circuit resources.

Report all runs, not only the strongest run. If a job is excluded, record the exclusion rule and reason before looking at performance wherever practical.

A strong classical optimiser remains the benchmark and validator. Any later claim of practical benefit requires a separate comparison against appropriate classical methods, including cost, runtime and solution quality under equivalent problem definitions.

## Software-version control

IBM Quantum Compute client release **0.50.0 (24 September 2026)** deprecated `EstimatorV2` and `SamplerV2` in favour of newer client-side `Estimator` and `Sampler` implementations. Therefore:

- an exact reproducibility attempt should pin the historical software environment where feasible;
- a run using the newer interface must be labelled a protocol-version change;
- output-schema, mitigation and execution differences must be documented rather than assumed equivalent.

References:
- https://quantum.cloud.ibm.com/docs/en/api/qiskit-ibm-runtime/release-notes
- https://quantum.cloud.ibm.com/docs/en/guides/qiskit-runtime-primitives

## Stop conditions

Do not progress to public performance claims if:
- the frozen classical benchmark cannot be independently reproduced;
- package/interface versions are unknown;
- measurement distributions are incomplete;
- runs are selectively omitted;
- synthetic-vs-live data boundaries become unclear;
- wording implies IBM endorsement, customer savings, quantum advantage or production readiness without new evidence.
