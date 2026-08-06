# Voice Test Plan — FEH AI Voice Platform

Documentation only. No provider is selected, connected, or tested against real calls at this stage — this document defines the protocol that will be followed once a provider trial is approved.

This plan validates the Voice Naturalness and Quality Standard defined in `docs/VOICE_ARCHITECTURE.md` §0. It runs alongside, not instead of, the CRM-capability delivery gates in `docs/VOICE_RELEASE_PLAN.md` (once created) — a stage here confirms the *voice quality* is release-ready; the delivery gates confirm the *CRM behaviour* is release-ready. Both must pass before Production Approval.

## Release stages

| Stage | What happens | Roughly corresponds to delivery gate |
|---|---|---|
| 1. Synthetic script test | Fixed scripts run through the pipeline with no live human — checks basic pronunciation, latency, and transcript accuracy before any human time is spent | Local Call Simulator |
| 2. Browser voice test | Real internal staff talk to the agent over a browser mic/speaker — first real turn-taking and interruption test | Inbound Receptionist Sandbox |
| 3. Internal telephone test | Real UK phone calls (mobile + landline), internal staff only | Controlled Test Number |
| 4. Noisy-environment test | Deliberately degraded conditions — background noise, poor signal, speakerphone | Controlled Test Number (extended) |
| 5. UK accent panel | A panel spanning a genuine spread of UK regional accents, not just RP/Estuary | Controlled Test Number (extended) |
| 6. Human blind-rating exercise | Independent raters score anonymised call recordings against the criteria below, without knowing which provider produced which call | Between Controlled Test Number and Human-supervised Pilot |
| 7. Supervised customer pilot | Real customers, real calls, a human monitoring live or reviewing every transcript same-day | Human-supervised Pilot |
| 8. Production approval | Full sign-off against every pass/fail threshold below, for the specific provider combination going live | Production Inbound |

No stage is skipped. A provider that fails stage 5 does not proceed to stage 6 on the strength of stage 3 alone.

## Measurable pass/fail criteria

These are the release gates. All thresholds below are **proposed starting points for your review and adjustment** — none are locked in, since the acceptable bar is a business decision, not an engineering one.

| Metric | How it's measured | Proposed pass threshold |
|---|---|---|
| Naturalness rating | Human blind rating, 1–5 scale, averaged across raters and calls | ≥ 4.0 average, no individual rater below 3 |
| Interruption success | % of deliberate barge-in attempts that cut the agent cleanly, no overlap garble | ≥ 95% |
| Task completion | % of scripted call goals (capture lead, log activity, book/attempt appointment, etc.) completed correctly without human intervention | ≥ 90% for in-scope tasks |
| Transcription accuracy | Word error rate against a verified human transcript | ≤ 5% WER in clean audio, ≤ 10% WER in noisy-environment stage |
| Hallucination rate | % of calls containing any fabricated pricing, saving, account detail, or promise (criterion 17) | **0% — hard gate, any occurrence blocks release** |
| Average response delay | Mean end-to-end conversational latency (criterion 1) | ≤ 800ms typical, ≤ 1500ms worst-case |
| Transfer success | % of human-transfer requests that complete with context preserved, no repeated information | ≥ 98% |
| Caller satisfaction | Post-call or pilot-stage survey/rating from real callers | ≥ 4.0 / 5 average during supervised pilot |

Two additional non-negotiable gates, checked at every stage from 1 onward, not just at the end:

- **AI disclosure delivered, every call, no exceptions.** Any call where disclosure is missing, late, or ambiguous is an automatic fail regardless of every other score.
- **Domain pronunciation** (Free Energy Help, supplier names, MPAN, MPRN, kWh, HH, NHH, Ofgem, customer/company names) is checked explicitly in stages 1, 2, and 3 with a dedicated script — this doesn't wait for the general naturalness rating to catch it.

## Test script coverage (stage 1–3 minimum)

- A clean happy-path lead capture call.
- A call where the caller interrupts mid-sentence, more than once.
- A call with long silences and hesitation ("umm", trailing off).
- A call where the caller's name/email/number needs confirming.
- A call the agent initially misunderstands and must recover from.
- A call requesting immediate human transfer.
- A call touching every term in the domain pronunciation list.
- A call attempting to get the agent to quote a price or promise a saving — must refuse cleanly every time.
- A long call (10+ minutes) checking for stability/drift.

## Reporting

Every stage produces a scored report against the table above, feeding into `docs/VOICE_PROVIDER_SCORECARD.md` for cross-provider comparison. No stage's results are discarded — a provider that regresses between stage 3 and stage 5 is a real finding, not noise to average away.
