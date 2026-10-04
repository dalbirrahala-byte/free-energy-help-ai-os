# FEH Quantum Procurement Lab — press release draft

**DRAFT — NOT FOR DISTRIBUTION OR PUBLICATION — 4 October 2026**

## Free Energy Help completes exploratory procurement-optimisation experiment on IBM Quantum hardware

Free Energy Help (FEH) has completed an exploratory synthetic commercial-energy procurement optimisation experiment using IBM Quantum hardware.

The experiment used a frozen six-site synthetic procurement problem. FEH first solved the same objective with an exact classical method, establishing a benchmark objective score of **17.00**. A one-layer QAOA-style circuit was then sampled on the IBM Quantum backend recorded in the retained job as `ibm_marrakesh`, using **1,024 measurements**.

The exact classical optimum appeared **228 times out of 1,024 measurements (22.2656%)**, making it the second-most frequent measured candidate. The most frequent candidate appeared **247 times (about 24.12%)** and had a slightly worse objective score of **17.04**.

The retained IBM job record reported **two seconds of QPU usage**. This is QPU usage metadata only and is not a claim about total elapsed time, end-to-end runtime or commercial computing cost.

FEH is treating the result as a **technical feasibility milestone**. The experiment shows that an end-to-end research workflow can be run from a procurement-style objective and classical benchmark through to real-hardware quantum sampling and comparison of the measured candidates.

The result does **not** demonstrate quantum advantage, customer savings, lower supplier prices, commercial superiority or production readiness. It used synthetic data only and made no live customer procurement decisions.

The next planned research step is a controlled repeatability study using the same frozen six-site problem. FEH intends to record all runs under a predeclared protocol and compare exact-optimum hit rate and rank, best-sampled regret, modal-candidate regret, output-distribution stability, circuit resources, software versions, backend identity and QPU usage against strong classical baselines before increasing the problem size.

IBM Quantum Compute client release 0.50.0, released **24 September 2026**, deprecated the legacy `EstimatorV2` and `SamplerV2` interfaces in favour of newer client-side `Estimator` and `Sampler` implementations. FEH will therefore treat any future run using the newer interface as a recorded protocol-version change rather than silently assuming exact equivalence with the retained run.

IBM is named only as the provider of the quantum hardware/service used in the retained experiment. FEH does not claim an IBM partnership, sponsorship, endorsement or validation.

### Evidence and publication controls

This draft is governed by the FEH Quantum Procurement Lab claim/evidence register and reproducibility summary. Before any public release, every quantitative statement must be reconciled with the retained job record and the final wording must pass human commercial/legal review.

### Public technical references

- IBM Quantum Compute client release notes: https://quantum.cloud.ibm.com/docs/en/api/qiskit-ibm-runtime/release-notes
- IBM dynamic-circuit backend example including `ibm_marrakesh`: https://quantum.cloud.ibm.com/docs/en/guides/execute-dynamic-circuits
