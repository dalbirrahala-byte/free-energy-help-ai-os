# FEH Quantum Procurement Lab — one-page use-case brief

DRAFT — NOT SENT

## Use case
Hybrid quantum/classical optimisation for multi-site commercial-energy procurement research.

## Business problem
A multi-site energy buyer can face interacting choices across contract alternatives, price, risk, renewable preference, timing and site constraints. The combination space grows as sites and alternatives increase.

## Research question
Can QAOA-style sampling generate useful candidate portfolios while an exact or otherwise strong classical optimiser remains the benchmark and validator?

## Evidence already obtained
FEH has completed a synthetic six-site experiment using real IBM Quantum hardware. In 1,024 measurements, the exact classical optimum appeared 228 times (22.2656%) and ranked second. The modal hardware candidate appeared 247 times (24.12%) and was slightly worse on the frozen objective: 17.04 versus the exact optimum of 17.00. Reported compute usage for the run was two seconds.

## What the result means
The end-to-end research workflow operated: procurement-style objective, classical benchmark, QAOA circuit preparation, real-hardware sampling and result comparison. The hardware mode was not the exact optimum, so noise, parameter selection, circuit depth and repeatability remain material research questions.

## Proposed next study
Repeat the same frozen problem across multiple controlled hardware jobs; report exact-optimum rank and hit rate, best-sampled regret, distribution stability, circuit resources and compute usage; compare with strong classical baselines before increasing problem size.

## Boundaries
Synthetic data only. No production customer decisioning. No claim of quantum advantage, customer savings, better supplier prices, IBM partnership or IBM endorsement.
