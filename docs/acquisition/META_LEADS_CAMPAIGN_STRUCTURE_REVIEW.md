# FEH Meta Leads Campaign Structure — Review Only

Status: **prepared, not activated**

No ad, budget, form publication, CRM webhook, SMS or customer contact is activated by this document.

## Objective

Use a Meta **Leads** campaign, not Engagement, to generate UK commercial-energy enquiries that can be qualified consistently and then passed through FEH's separate verified-lead controls.

## Initial campaign

- Campaign: `FEH | Leads | East Midlands | Business Energy | Test 01`
- Objective: Leads
- Conversion location: Instant Forms
- Geography: East Midlands initial test
- Age: 25+
- Paid activation: OFF until separately approved
- Creative: Dalbir presenter video + one static backup
- Primary CTA: Get Quote / Learn More, whichever the platform currently supports and passes review
- Optimisation target: completed lead forms; never optimise for engagement as the primary commercial objective

## Instant Form

Use Meta's higher-intent/review experience when available in the account.

### Qualification questions

1. **Is this enquiry for a UK business?**
   - Yes
   - No → disqualifying / do not mark sales-ready

2. **What would you like help with?**
   - Electricity
   - Gas
   - Electricity and gas
   - Change of tenancy / new premises
   - Billing or meter issue

3. **When does your current business energy contract end?**
   - Already out of contract
   - Within 30 days
   - 31–90 days
   - 3–6 months
   - 6–12 months
   - More than 12 months
   - Don't know

4. **Approximately how much does the business spend on energy each month?**
   - Under £250
   - £250–£1,000
   - £1,001–£2,000
   - £2,000+
   - Not sure

5. **Who is your current energy supplier?**
   - Short answer
   - Optional if Meta form friction becomes material; absence must remain explicit in CRM

6. **Are you responsible for, or authorised to discuss, the business energy account?**
   - Yes
   - No → retain only for review; never mark hot automatically

7. **Business name**
   - Short answer

8. **Contact details**
   - Name
   - Email
   - Mobile number

9. Privacy notice / consent wording
   - Must identify Free Energy Help and the purpose of contact.
   - Must link the current privacy policy.
   - No supplier comparison/savings guarantee.

## Meta → FEH verification boundary

A Meta form submission is **not** a verified mobile lead.

Future controlled route:

`Meta submitted → source authenticated → CRM persisted as UNVERIFIED → FEH mobile OTP evidence → deterministic qualification → VERIFIED_REVIEW / VERIFIED_CALL_NOW`

Until live OTP delivery is separately approved, Meta leads must remain explicitly unverified.

A safe post-submit CTA can invite the user to continue to FEH's verification/Health Check page once that route is production-ready. Do not claim verification occurred inside Meta.

## Required CRM provenance

Persist:
- provider = Meta
- Meta form ID
- external lead ID
- campaign ID
- ad set ID
- ad ID
- received timestamp
- form version
- source authentication status
- original qualification answers
- consent wording/version
- OTP verification state separately
- qualification state separately

Provider IDs prove attribution only; they do not prove identity, consent or authority.

## Lead quality rule

A future `VERIFIED_CALL_NOW` state requires:
- UK business
- contact consent
- mobile OTP verified
- authority explicitly Yes
- out of contract / within 90 days
- monthly spend £1,001+ per month

This is a human callback priority only. It never enables automatic outreach.

## Creative test

A. Dalbir presenter: "When does your business energy contract end?"
B. Dalbir presenter: "Moving premises? Sort the energy account before it becomes a problem."
C. Static Health Check creative.

Test lead quality, not just CPL.

## Success measures

Primary:
- valid business
- verified mobile
- authorised decision-maker
- renewal timing known
- contact reached
- qualified opportunity
- quote requested
- signed contract

Secondary:
- form starts/completions
- CPL
- cost per verified lead
- cost per qualified opportunity

Do not optimise decisions around cheap raw form volume alone.
