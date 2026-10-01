# FEH Quantum Procurement Lab — public page draft

**DRAFT — NOT PUBLISHED — evidence-controlled**

## Researching optimisation methods for commercial-energy procurement

Free Energy Help's Quantum Procurement Lab is an exploratory research programme testing whether hybrid quantum/classical optimisation methods can produce useful candidate portfolios for synthetic multi-site commercial-energy procurement problems.

The work is research only. It does not make customer procurement decisions and it does not use live customer data, confidential supplier prices or production CRM records.

## What FEH tested

For the retained experiment, FEH froze a synthetic six-site optimisation problem and solved the same objective exactly with a classical method to create a benchmark. A one-layer QAOA circuit was then sampled on IBM Quantum hardware using 1,024 measurements.

The retained run record identifies the hardware backend as `ibm_marrakesh`.

## Result

The exact classical optimum had objective score **17.00**. It appeared **228 times out of 1,024 measurements (22.2656%)**, making it the second-most frequently measured candidate.

The most frequently measured candidate appeared **247 times (about 24.12%)** and had a slightly worse objective score of **17.04**.

The retained IBM job record reported **two seconds of QPU usage**.

## What this does — and does not — show

The experiment demonstrates an end-to-end feasibility workflow: define a procurement-style objective, establish a classical benchmark, prepare and execute a QAOA-style quantum circuit on real hardware, then compare sampled candidates with the classical optimum.

It does **not** establish quantum advantage, commercial superiority, customer savings, lower supplier prices, production readiness or performance at commercial scale. The most common hardware outcome in this run was not the exact classical optimum.

## Next research step

Before increasing problem size, FEH plans a controlled repeatability study on the same frozen synthetic problem. The study should report exact-optimum rank and hit rate, best-sampled regret, output-distribution stability, circuit resources, software versions, backend identity and QPU usage, and compare those results with strong classical baselines.

## Reproducibility note

The software environment must be pinned for repeat work. IBM Quantum Compute client release 0.50.0, published 24 September 2026, deprecated the legacy `SamplerV2` and `EstimatorV2` client interfaces in favour of newer client-side `Sampler` and `Estimator` implementations. A repeat using the newer interface must therefore be recorded as a protocol change rather than silently treated as identical to the retained run.

IBM documentation:
- https://quantum.cloud.ibm.com/docs/en/api/qiskit-ibm-runtime/release-notes
- https://quantum.cloud.ibm.com/docs/en/guides/qiskit-runtime-primitives

## Independence statement

IBM is named only as the provider of the quantum hardware/service used in the retained experiment. FEH does not claim an IBM partnership, sponsorship, endorsement or validation.

_Last reviewed: 1 October 2026. Draft for internal review only._
