# Voice Architecture — FEH AI Voice Platform

Architecture and documentation only. No code, packages, migrations, or external connections exist yet for this initiative — see `docs/MASTER_ARCHITECTURE.md` §6 for the cross-cutting gaps (no auth, no RLS, no API routes) that must be resolved before any tool gateway goes near real data.

## 0. Voice Naturalness and Quality Standard (top priority — release-blocking)

This is the single most important requirement in this document. **Voice quality is a release-blocking requirement, not a cosmetic enhancement.** No agent reaches Production Approval (see `docs/VOICE_TEST_PLAN.md`) without passing the full Voice Quality Gate below, regardless of how complete its CRM tool integration is.

**The standard:** the production voice experience must be exceptionally natural, warm, responsive, and professional — indistinguishable from a well-trained human receptionist in fluency and warmth, while never being dishonest about what it is.

**The non-negotiable transparency rule:** the agent must clearly and briefly identify itself as an AI assistant at the very beginning of every call. It must never be designed to deceive a caller or impersonate a human. This is not in tension with naturalness — after disclosure, the conversation should feel fluid, warm, and natural. Naturalness is how it *sounds and responds*; honesty about what it *is* is never negotiable, never skippable, and never A/B tested away.

### The Voice Quality Gate — 20 criteria

| # | Criterion | What's being judged |
|---|---|---|
| 1 | End-to-end conversational latency | Time from caller finishing speech to agent beginning its reply |
| 2 | Time to first audio | Time from agent deciding to speak to audible sound starting |
| 3 | Interruption and barge-in handling | Caller can cut the agent off cleanly, at any point, without lag or overlap garble |
| 4 | Turn-taking accuracy | Agent doesn't talk over the caller or leave awkward dead air waiting for a turn |
| 5 | Back-channel behaviour | Natural "mm-hmm" / acknowledgement cues at appropriate moments, not silence or over-use |
| 6 | Natural pacing, emphasis and prosody | Doesn't sound flat, robotic, or oddly stressed on the wrong words |
| 7 | Silence and hesitation handling | Handles caller pauses/"umm"s without jumping in prematurely or going silent too long |
| 8 | Background-noise resilience | Stays accurate and composed with real-world caller-side noise |
| 9 | UK regional accent recognition | Genuinely understands a spread of UK accents, not just RP/Estuary |
| 10 | Mobile and poor-line performance | Holds up over degraded mobile audio, not just clean broadband/fixed-line calls |
| 11 | Domain pronunciation | Free Energy Help, supplier names, MPAN, MPRN, kWh, HH, NHH, Ofgem, customer/company names — see below |
| 12 | Natural confirmation of uncertain names, emails and numbers | Confirms spelling/digits conversationally, not by robotically spelling everything back always |
| 13 | Recovery after misunderstanding | Graceful correction, not looping or doubling down on a wrong assumption |
| 14 | Emotional appropriateness | Tone matches context — calm for a frustrated caller, brisk for a quick request |
| 15 | Human transfer quality | The handoff itself is smooth — context isn't lost, caller isn't made to repeat everything |
| 16 | Stability during longer conversations | No quality/drift/degradation as a call runs past a few minutes |
| 17 | No fabricated pricing, savings, account details or promises | **Hard gate** — same "never fabricate" principle enforced everywhere else in this codebase, applied to speech |
| 18 | Transcript accuracy | The written record matches what was actually said |
| 19 | Call-summary accuracy | The generated summary reflects the transcript, not an embellished version of it |
| 20 | Cost per successful call | Economic viability at real volume, not just quality in isolation |

Criterion 11 (domain pronunciation) needs its own explicit test list, since generic TTS benchmarks won't cover UK energy-sector terms:

- **Free Energy Help** (the organisation's own name — must be said correctly, every call, no exceptions)
- Supplier names (British Gas, EDF, E.ON, Octopus, Scottish Power, and others as they arise)
- **MPAN** (Meter Point Administration Number — electricity)
- **MPRN** (Meter Point Reference Number — gas)
- **kWh** (kilowatt-hour — said as a unit, not spelled out letter by letter)
- **HH** / **NHH** (Half-Hourly / Non-Half-Hourly metering)
- **Ofgem**
- Customer and company names — including names the TTS engine has never seen before, correctly stressed and not mangled

Criteria 1, 2, 3, 20 are quantitative (measured in ms/£). Criteria 17 and the transparency rule are hard pass/fail gates. The rest are rated by structured human review — see `docs/VOICE_TEST_PLAN.md` for exact pass/fail thresholds and `docs/VOICE_PROVIDER_SCORECARD.md` for how they're weighted during provider selection.

---

## 1. Current-system assessment (summary)

Full detail lives in `docs/MASTER_ARCHITECTURE.md`. In short: this is a Next.js + Supabase CRM with **no authentication, no RLS policies, and no API routes anywhere** — a voice agent runtime lives outside this app's request lifecycle and has nothing to call into today. That gap is a prerequisite for the CRM Tool Gateway gate (`docs/VOICE_RELEASE_PLAN.md`, once created), not something voice quality work can route around.

Reusable patterns already proven in this codebase, directly relevant to voice:
- The **four-state truthful-status vocabulary** (`Connected / Not configured / Unavailable / Checking`) from the AI Control Centre — the right template for provider-adapter health reporting below.
- The **value + badge + explanation** pattern from Commercial Energy Intelligence and Renewal Intelligence — the right template for call quality scoring and `quality_reviews`.

## 2. Target architecture — replaceable adapters

Provider-independent core, thin adapters at every edge — no vendor is ever assumed permanent, and every adapter must be swappable without touching the orchestration core or the CRM tool contracts.

```
┌─────────────────────────────────────────────────────────────┐
│                     Voice Orchestration Core                  │
│   (state machine, tool router, audit log, compliance guard,   │
│              Voice Quality Gate instrumentation)               │
└─────────────────────────────────────────────────────────────┘
        │            │            │            │           │
   ┌────▼───┐   ┌────▼────┐  ┌────▼────┐  ┌────▼───┐  ┌────▼─────┐
   │Telephony│   │  STT    │  │  LLM    │  │  TTS   │  │ CRM Tools │
   │ Adapter │   │ Adapter │  │ Adapter │  │Adapter │  │  Gateway  │
   └─────────┘   └─────────┘  └─────────┘  └────────┘  └───────────┘
```

| Adapter | Contract shape | Quality Gate criteria it owns |
|---|---|---|
| Telephony/SIP | `answer()`, `bridge()`, `transfer()`, `hangup()`, `sendDTMF()`, audio stream in/out | #10 mobile/poor-line, #15 transfer quality |
| Speech-to-text | `streamTranscript(audioChunk) → {text, confidence, isFinal}` | #8 noise resilience, #9 UK accents, #18 transcript accuracy |
| Language model | `respond(conversationState, tools) → {text, toolCalls[]}` | #13 recovery, #14 emotional appropriateness, #17 no fabrication, #19 summary accuracy |
| Text-to-speech | `synthesize(text) → audioStream` | #6 prosody, #11 pronunciation, #2 time to first audio |
| CRM tools | Internal — the `docs/VOICE_TOOL_CONTRACTS.md` contracts | N/A — correctness, not voice quality |
| Calendar | `checkAvailability()`, `bookSlot()` | N/A — no real backend exists yet (see MASTER_ARCHITECTURE §2.3) |
| Workflow automation | n8n webhook calls, fire-and-retry | N/A |
| Analytics/quality | Ingests `call_events`, produces `quality_reviews` | Owns aggregation of all 20 criteria across calls |

Every adapter reports its own health using the same four-state vocabulary as the AI Control Centre — no adapter is ever allowed to claim "Connected," let alone pass the Voice Quality Gate, without a genuine, evidenced check.

## 3. How this constrains provider selection

Because naturalness is release-blocking and the transparency rule is non-negotiable, provider selection (`docs/VOICE_PROVIDER_SCORECARD.md`) cannot be decided from vendor marketing demos. It requires blind testing against the criteria above, across synthetic scripts, real browser calls, real UK telephone calls, deliberately noisy conditions, a UK accent panel, and human blind rating — see `docs/VOICE_TEST_PLAN.md` for the full staged protocol. No provider is selected or connected at this stage.
