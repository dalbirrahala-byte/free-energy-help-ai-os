# Voice Provider Scorecard — FEH AI Voice Platform

Documentation only. **No provider has been selected or connected.** This document defines the comparison framework and methodology; the scores below are empty templates, to be filled in only after the staged testing in `docs/VOICE_TEST_PLAN.md` has actually been run.

## Methodology: blind testing, not marketing demos

Provider selection must be based on blind testing against the Voice Quality Gate in `docs/VOICE_ARCHITECTURE.md` §0 — not vendor demo reels, published benchmark claims, or sales conversations. Concretely:

- Every candidate is run through the **same** scripts from `docs/VOICE_TEST_PLAN.md`.
- Recordings are anonymised before human rating — raters score "Call A", "Call B", etc., without knowing which provider produced which call, until scoring is complete.
- Quantitative metrics (latency, WER, cost) are measured directly from our own test harness, not taken from provider-published figures.
- A provider only advances past a stage on its own evidenced results at that stage.

## Candidates under evaluation

At least these five, representing genuinely different architectural approaches — not five variations of the same thing:

| Candidate | Architecture type |
|---|---|
| ElevenLabs / ElevenAgents | End-to-end conversational voice platform |
| Retell AI | End-to-end conversational voice platform |
| OpenAI real-time voice | Single-vendor integrated LLM+speech |
| Vapi | End-to-end conversational voice platform |
| Modular Deepgram/Cartesia-based architecture | Build-it-ourselves: separate STT + LLM + TTS behind our own adapters |

The modular option is architecturally important to test even if it scores lower on convenience — it's the only candidate that fully matches the "no vendor lock-in" adapter design in `docs/VOICE_ARCHITECTURE.md` §2, so its quality bar matters even if it's not the first choice.

## Scoring structure

Three tiers, matching how the 20 Voice Quality Gate criteria actually behave — not everything can be averaged into one number without losing what matters most.

### Tier 1 — Hard gates (pass/fail; a single failure disqualifies the candidate)

- Transparency rule: AI disclosure delivered correctly, every call.
- Criterion 17: zero fabricated pricing, savings, account details, or promises across all test calls.
- UK number / SIP support genuinely exists (not just a roadmap promise).
- Data location and retention terms meet our compliance requirements (see `docs/VOICE_COMPLIANCE.md`, once created).

### Tier 2 — Weighted quality scores (1–5 human-rated, × proposed weight below)

| Criterion | Proposed weight |
|---|---|
| Naturalness (pacing, prosody, emphasis) | 15% |
| Interruption / barge-in handling | 15% |
| Turn-taking accuracy | 10% |
| Back-channel behaviour | 5% |
| Domain pronunciation | 15% |
| Recovery after misunderstanding | 10% |
| Emotional appropriateness | 5% |
| Human transfer quality | 10% |
| Stability over longer calls | 5% |
| UK accent recognition | 10% |

Weights above are a **proposed starting point for your review** — not locked in. Domain pronunciation and interruption handling are weighted heavily because they're the two failure modes most likely to make a caller distrust the system immediately.

### Tier 3 — Quantitative targets (measured, not rated)

| Metric | Target |
|---|---|
| End-to-end latency | ≤ 800ms typical |
| Time to first audio | ≤ 500ms typical |
| Background-noise resilience | WER ≤ 10% in noisy-environment stage |
| Mobile/poor-line performance | No material quality drop vs. clean-line baseline |
| Cost per successful call | Modelled against realistic call volume, compared across candidates on equal footing |

## Scorecard (template — not yet filled in)

| Candidate | Tier 1 gates | Tier 2 weighted score | Tier 3 vs. targets | Overall |
|---|---|---|---|---|
| ElevenLabs / ElevenAgents | Not tested | — | — | — |
| Retell AI | Not tested | — | — | — |
| OpenAI real-time voice | Not tested | — | — | — |
| Vapi | Not tested | — | — | — |
| Modular Deepgram/Cartesia | Not tested | — | — | — |

## Required testing before any score is entered

Per `docs/VOICE_TEST_PLAN.md`, no cell above is filled in until the candidate has completed, at minimum:

1. Synthetic script test
2. Browser voice test
3. Internal telephone test (real UK numbers — mobile and landline)

Noisy-environment, UK accent panel, and human blind-rating results are added as they complete for each candidate. **No provider is selected for the Supervised Customer Pilot stage until every candidate under active consideration has completed at least stages 1–3**, so the comparison is genuinely even, not first-past-the-post on whichever vendor was tested first.
