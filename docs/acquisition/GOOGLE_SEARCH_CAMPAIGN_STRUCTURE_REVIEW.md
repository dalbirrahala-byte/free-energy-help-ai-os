# FEH Google Search Campaign Structure — Review Only

Status: **prepared, not activated**

## Key opportunity

Google Search lead form assets currently support:
- Google-hosted lead forms
- custom qualifying questions
- qualifying-response tagging
- **SMS phone-number verification using a one-time password (OTP)**
- CRM lead delivery via webhook/API/email/CSV

This offers FEH a route to verified telephone leads that is not dependent on the Airo website form.

Account eligibility, policy status and the feature's actual availability in FEH's account must be confirmed before use.

## Recommended first structure

Campaign: `FEH | Search | East Midlands | Business Energy Leads | Test 01`

Goal:
- Leads
- Search only initially
- Google-hosted lead form asset as the primary controlled test
- Website Health Check retained as a later/parallel route after Airo is fixed

Budget:
- OFF until separately approved
- no restart of the previous campaign by simply re-enabling it

Location:
- East Midlands
- presence targeting, not broad UK interest, where the account setting allows

## Ad groups

### 1. Business energy renewal
Intent examples:
- business energy renewal
- business electricity renewal
- commercial energy contract renewal
- business energy contract ending
- compare business energy renewal

### 2. Business electricity / gas quote
Intent examples:
- business electricity quote
- commercial electricity quote
- business gas quote
- business energy quote

### 3. Change of tenancy / new premises
Intent examples:
- business energy change of tenancy
- commercial electricity new tenant
- business energy new premises
- previous tenant energy debt business

### 4. Billing / meter help
Keep separate from pure procurement because intent and commercial workflow differ.

## Negative-keyword themes

Initial negatives should include consumer/domestic and obviously irrelevant intent:
- residential
- home
- household
- jobs
- careers
- salary
- course
- training
- free electricity
- energy grant, unless a separately evidenced campaign exists
- supplier login / customer service navigation where not commercially relevant

Review search terms frequently. Do not copy an old negative list blindly.

## Google-hosted Lead Form

Contact fields:
- Full name
- Business email
- Phone

Enable Google **phone number verification (OTP)** if available in the FEH Search account.

Custom qualifying questions should mirror Meta/FEH:
- UK business?
- energy supply/help type
- contract end / renewal timing
- monthly spend
- authority to discuss energy account
- current supplier where the supported question format allows

Use Google's qualifying-response feature to distinguish useful answers, but do not let a Google qualification tag replace FEH's authoritative CRM state.

## Conversion hierarchy

Do not optimise only to a raw lead submission.

1. Raw lead submitted
2. OTP-verified phone
3. FEH qualification accepted
4. Contact reached
5. Qualified opportunity
6. Quote requested
7. Contract won

Where supported later, import downstream qualified/won outcomes back to Google for optimisation.

## Website route — only after verified E2E

Future alternate path:

`Search click → FEH Health Check → FEH OTP → authoritative CRM lead → exactly one Google conversion`

Requirements before activation:
- auto-tagging / attribution preserved
- consent handling reviewed
- duplicate submissions suppressed
- conversion event emitted only after authoritative accepted ingestion
- test record clearly marked and excluded from commercial reporting

## Compliance

- Privacy policy required for Google lead forms.
- No guarantee of savings or eligibility.
- Phone number used in call assets must be accurate, active and visible on the linked site.
- User consent and UK privacy obligations remain separate from platform lead verification.

## Launch gate

Do not enable spend until:
- exact Search campaign/lead form reviewed
- FEH lead delivery destination proven
- test lead visible once in CRM
- OTP verification evidence visible
- no duplicate CRM lead
- callback workflow visible
- measurement matches the test
