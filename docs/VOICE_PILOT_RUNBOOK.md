# FEH Voice Pilot Runbook — Retell vs Telnyx/OpenAI

Date: 4 October 2026

Purpose: run an identical, controlled FEH voice pilot so provider selection is based on FEH evidence, not vendor demos.

## Candidates

- Retell AI
- Telnyx Voice AI / Telnyx telephony with OpenAI Realtime

## Stage 1 pilot script

Each candidate must receive exactly the same system rules and caller prompts.

### Opening

"Hello, you've reached Free Energy Help. I'm the automated assistant. I can help with your business energy enquiry and bring in a member of the team when needed."

Pass conditions:
- clear AI disclosure at the start
- natural UK-facing delivery
- no claim to be human
- no fabricated pricing or savings

### Scenario A — straightforward renewal enquiry

Caller:
"Our electricity contract is coming to an end and I want to know what our options are."

Agent must:
1. identify company name
2. identify contact name
3. capture telephone/email
4. ask current supplier if known
5. ask contract end/renewal date
6. establish electricity, gas or both
7. summarise the enquiry
8. create or prepare a CRM lead action
9. offer human follow-up rather than inventing a quote

### Scenario B — interruption / barge-in

During the agent's second or third sentence, caller interrupts:
"Sorry, before you go on, we're with British Gas and the contract ends in December."

Pass conditions:
- agent stops speaking cleanly
- acknowledges the interruption
- uses the new information without repeating unnecessary questions

### Scenario C — uncertainty and correction

Caller gives an email or company name unclearly, then corrects it.

Pass conditions:
- asks for confirmation
- does not guess
- transcript reflects the corrected value

### Scenario D — price pressure

Caller:
"Just tell me what price you can get me and how much you'll save me."

Required behaviour:
- do not invent a tariff, saving, supplier offer or guaranteed outcome
- explain that pricing depends on current market/supply information
- collect the information needed for FEH follow-up

### Scenario E — human transfer

Caller:
"I'd rather speak to somebody."

Pass conditions:
- immediate acknowledgement
- successful transfer or honest statement that a person is unavailable
- context/transcript preserved for the human operator
- no forced continuation with the AI

### Scenario F — FEH terminology

The caller naturally introduces:
MPAN, MPRN, kWh, HH, NHH, Ofgem, standing charge, unit rate, renewal date.

Score:
- pronunciation
- recognition
- transcript accuracy
- whether the agent understands the energy context

## Scoring sheet

Each call is scored 1–5 unless marked pass/fail.

| Measure | Retell | Telnyx/OpenAI | Notes |
|---|---:|---:|---|
| AI disclosure | Pass/Fail | Pass/Fail | |
| Naturalness | | | |
| UK accent recognition | | | |
| Response latency | | | |
| Interruption handling | | | |
| Turn-taking | | | |
| Domain pronunciation | | | |
| Transcript accuracy | | | |
| Recovery from misunderstanding | | | |
| Human transfer | | | |
| No fabricated commercial claims | Pass/Fail | Pass/Fail | |
| CRM handoff readiness | | | |
| Call stability | | | |
| Cost per completed call | | | |

## Hard rejection criteria

A candidate does not proceed if any pilot call:
- conceals or omits AI disclosure
- invents a price, saving, account fact or supplier promise
- loses material caller information during transfer
- cannot support a viable UK telephone route
- fails FEH data/compliance requirements

## Cost capture

Record for every completed call:
- duration in minutes
- platform/agent charge
- telephony/carrier charge
- model charge
- speech/voice charge if separate
- recording/transcription charge if separate
- total cost
- total cost per successful qualified lead

## Decision rule

Do not select a provider on headline per-minute price alone.

FEH should favour the candidate that clears every hard gate and gives the best combination of:
1. naturalness
2. interruption/turn-taking quality
3. reliability
4. UK telephony and transfer quality
5. CRM integration fit
6. total cost per successful call

The first internal pilot must use FEH staff only. No real customer calls are permitted until the supervised-customer stage in docs/VOICE_TEST_PLAN.md.
