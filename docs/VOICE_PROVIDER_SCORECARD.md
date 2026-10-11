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
| Telnyx Voice AI | Carrier-integrated voice-agent platform |
| OpenAI real-time voice | Single-vendor integrated LLM+speech |
| Vapi | End-to-end conversational voice platform |
| Modular Deepgram/Cartesia-based architecture | Build-it-ourselves: separate STT + LLM + TTS behind our own adapters |

The modular option is architecturally important to test even if it scores lower on convenience — it's the only candidate that fully matches the "no vendor lock-in" adapter design in `docs/VOICE_ARCHITECTURE.md` §2, so its quality bar matters even if it's not the first choice.

## Verified vendor snapshot — 4 October 2026

These are **vendor-published facts for planning only**. They are not FEH test results and do not change any score above.

| Candidate | Published planning facts checked on 4 Oct 2026 |
|---|---|
| Retell AI | Pay-as-you-go voice agents published at $0.07–$0.31/min depending on stack; platform includes transcripts, simulation testing, webhooks/API access, fallback support and opt-out recording/transcription controls. |
| Telnyx Voice AI | Voice engine published at $0.05/min plus LLM tokens and carrier telephony; includes orchestration, STT/TTS, interruption handling, tools and knowledge retrieval. Telnyx also publishes separate low-level SIP, recording and media-streaming rates. |
| Vapi | At 1,000 min/month, published calculator shows $50 hosting plus pass-through transcriber/model/voice costs; Core support package is $29/month and higher tiers publish SLA/support options. |
| OpenAI realtime voice | Realtime/Live supports WebRTC, WebSocket and SIP. Direct SIP flows support inbound acceptance, outbound calling (when enabled), transfer via SIP REFER and hang-up controls. Model usage is billed separately from telephony. |

### FEH pilot order

1. **Retell AI** — quickest end-to-end baseline to establish call quality and workflow fit.
2. **Telnyx Voice AI** — cost/reliability comparison using carrier-integrated infrastructure.
3. **OpenAI Realtime + SIP** — direct-control comparison for natural speech, tool use and transfer behaviour.
4. **Vapi** — modular orchestration comparison where provider interchangeability is the main advantage.

No provider is selected by this ordering. It only defines the order in which FEH should build identical test calls so the blind scorecard can be populated with our own evidence.

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
| Telnyx Voice AI | Not tested | — | — | — |
| OpenAI real-time voice | Not tested | — | — | — |
| Vapi | Not tested | — | — | — |
| Modular Deepgram/Cartesia | Not tested | — | — | — |

## Required testing before any score is entered

Per `docs/VOICE_TEST_PLAN.md`, no cell above is filled in until the candidate has completed, at minimum:

1. Synthetic script test
2. Browser voice test
3. Internal telephone test (real UK numbers — mobile and landline)

Noisy-environment, UK accent panel, and human blind-rating results are added as they complete for each candidate. **No provider is selected for the Supervised Customer Pilot stage until every candidate under active consideration has completed at least stages 1–3**, so the comparison is genuinely even, not first-past-the-post on whichever vendor was tested first.
