# FEH — intent-specific landing pages: review-only content and implementation brief

**Status:** Proposed copy/design, for Dominic and FEH owner to review. No live publication, production write, customer send, advertising activation or permission change.

**Owner direction:** Three recognisable Free Energy Help journeys matching actual business enquiry intent: **Contract Renewal**, **Change of Tenancy / New Occupier** and **Energy Bill Issues**. A visitor with unknown intent retains the general Health Check route. Owner approved *preparation and staging tests only* on 1 November 2026.

## Verified implementation constraint (1 Nov)

The existing Health Check page uses `BusinessEnergyQuoteForm`; that form and `validateWebsiteLeadForm` require `renewalTiming` for every submission, and `submitQuoteEnquiry` sends a fixed `p_source_detail: "Free Business Energy Health Check landing page"`. The actual enquiry reason is a short free-text `painPoint`. Acquisition-origin attribution describes *channel* (e.g., organic social), not *enquiry intent*. A URL, photograph or UTM alone must never be used as proof that the person is moving premises or disputing a bill.

**Implementation rule:** Do not add a public, fully working-sounding “billing” or “tenancy” CTA until the reviewed server action and staging CRM persistence correctly preserve explicit customer intent. Do not relax validation globally, change RLS/privileged functions, or reuse synthetic provider approval as real consent.

## Common FEH page treatment

- Use the existing approved FEH brand logo and palette, with a single uncluttered mobile-first hero and purpose-specific, accessible image. Source assets and permissions must be verified; do not use fabricated testimonials or supplier-affiliation logos.
- Company: **Free Energy Help**. Callback: **01332 605506**. Primary website: **freeenergyhelp.co.uk**; the .com alias may be used where already approved. Display a clear `tel:01332605506` link.
- Page explains that a consultant reviews the details and contacts the business during working hours; no instant quotation, guaranteed savings, automatic switch or guaranteed dispute outcome.
- State the scope is UK business electricity and/or gas; allow a person to select another reason or return to the general Health Check.
- Keep data collection short, proportionate and accessible. Enquiry-specific contact permission is separate from any future marketing opt-in. State how information is used, link to the real privacy notice, do not ask for card/bank information.
- All submitted forms must use the approved secure ingestion boundary, with idempotency, provenance, suppression checks and a review task. No PII in event logs or URLs.

## Landing page A: Contract Renewal

**Proposed route**: `/business-energy-renewal` (not published).

**Hero image brief:** An authentic UK business manager reviewing a calendar and an energy agreement in a professional workplace; no supplier logos, invented rates, figures, or meter identifiers. Meaningful alt text, not repetitive marketing text.

**Eyebrow:** BUSINESS ENERGY CONTRACT RENEWALS

**Headline:** Is your business energy contract due for renewal?

**Introduction:** We can review your electricity, gas or combined business energy needs before your current agreement ends. Tell us when your renewal is due and we'll discuss appropriate next steps and the options available for your circumstances.

**Primary CTA:** Request My Renewal Review

**Secondary CTA:** Call Free Energy Help — 01332 605506

**What happens:** 1) Tell us when your contract ends, 2) FEH reviews your enquiry, 3) an FEH consultant contacts you to discuss the next step. No automatic switch or quotation.

**First questions:** Renewal window (known or 'not sure'); approximate monthly energy spend (optional if unavailable). Business identity/contact details follow.

**Trust without unsupported claims:** Explain how supplier options and any commission/fees will be disclosed; link to complaints/privacy pages and verified registration information.

## Landing page B: Change of Tenancy

**Proposed route:** `/business-energy-change-of-tenancy` (not published).

**Hero image brief:** A realistic handover of keys at a British commercial unit, such as a shop or industrial workspace. Avoid implying that FEH is the letting agent or that the property is a specific real customer site.

**Eyebrow:** MOVING INTO BUSINESS PREMISES

**Headline:** Moving into or taking over business premises?

**Introduction:** Business energy arrangements can be confusing when a tenant changes. FEH can help you understand the current supplier, meter details and what information is needed for the change. Tell us about the premises and we'll explain the next steps.

**Primary CTA:** Get Change of Tenancy Help

**Secondary CTA:** Call Free Energy Help — 01332 605506

**What happens:** 1) Tell us whether you're moving in or already occupying the site, 2) FEH identifies the information needed, 3) we'll contact you about the supplier/tenancy process.

**First questions:** Moving in / moved in / taking over / unsure; expected occupancy date **optional** (do not invent dates). If the respondent lacks authority over energy at the site, follow review-only handling.

**Do not require a renewal window merely to ask about a tenancy.** Supplier/meter identifiers and evidence of occupancy may be requested securely later, not in advertising URLs.

## Landing page C: Billing Problems

**Proposed route:** `/business-energy-bill-help` (not published).

**Hero image brief:** A UK business energy invoice and digital meter being reviewed at an office desk; no real account numbers, personal details, recognisable genuine bills or invented refund figures.

**Eyebrow:** BUSINESS ENERGY BILLING AND METER HELP

**Headline:** Concerned your business energy bill might be wrong?

**Introduction:** Estimated readings, unexpected charges and supplier disputes can be difficult to resolve. Tell us what seems wrong and FEH can review your enquiry, explain which records may be needed and discuss possible next steps.

**Primary CTA:** Request a Bill Review

**Secondary CTA:** Call Free Energy Help — 01332 605506

**What happens:** 1) Tell us about the problem, 2) FEH explains any documents needed, 3) a consultant discusses what can be checked or escalated. No guaranteed refund, successful dispute or instant audit.

**First questions:** Estimated reading / unexpected charge / meter issue / supplier dispute / unsure; gas/electricity/both or unknown. **Do not require a renewal date** for a bill question.

**Privacy:** Do not collect full bills, payment-card details or bank data on the first advertising form. If documents are needed later, use an authorised secure document route.

## CRM intent classification / source reliability

Use a small allowlisted vocabulary (`renewal`, `change_of_tenancy`, `billing_issue`, `general`) validated at the **server-side ingestion boundary**. Differentiate:
- **Declared intent:** visitor's explicit selection, correctable, or a dedicated first-party page with visible matching form question.
- **Acquisition provenance:** verified provider form/campaign ID where available, route ID, validated content variant and optional bounded UTMs, with trust level. Untrusted URLs must not silently override the person's answer.
- **Actual submitted need:** answer to the first question(s) and any short text the person provides.

For unknown/ambiguous cases use `general`, not an invented billing or tenancy classification. Preserve lead and follow-up deduplication on provider replays; don't spawn extra SMS reservations when a customer changes pages. Avoid claiming that provider callbacks and website form already share a working deployment before staged evidence.

## Transactional acknowledgement copy — proposal only; do NOT send or replace tested template

The first working Telnyx owner test used an approved fixed message. Any variant below requires fresh exact-template approval, sender eligibility and the existing reviewer/STOP/destination gates.

- Renewal: “Hi [First Name], thanks for your business energy renewal enquiry to Free Energy Help. Dalbir will call from 01332 605506 during business hours. - FEH”
- Tenancy: “Hi [First Name], thanks for contacting Free Energy Help about your premises move. Dalbir will call from 01332 605506 during business hours. - FEH”
- Billing: “Hi [First Name], thanks for your business energy billing enquiry to Free Energy Help. Dalbir will call from 01332 605506 during business hours. - FEH”
- Uncertain source: use the approved neutral acknowledgement, not a guessed category.

Standard SMS is text-only; landing-page photos, full logos and colours belong to the web pages. WhatsApp or RCS rich cards are separate later channels with distinct technical, consent, template and cost gates.

## Tests / release gates

1. Review distinct mobile and desktop layouts, image rights, contrast, keyboard focus, alt text and useful loading experience; no unverified 'independent', price or savings assertions.
2. Unknown-source visitor sees the general Health Check; a malicious or malformed `intent`/UTM field cannot bypass server validation or forge evidence of tenancy/billing.
3. All variants collect only necessary fields; conditional required fields match intent. Validate client **and server** identically. Abandoned requests never create an enquiry.
4. Provider-originated test and website synthetic test each create one attributable CRM lead and accountable next task. Repeat deliveries and re-entrant submits do not create duplicate leads, conversions, tasks or SMS.
5. Distinguish enquiry-specific contact permission from marketing consent. No automatic WhatsApp/RCS or supplier contact.
6. Verify Preview uses only approved staging project and synthetic/owner-controlled test contacts; test staff authorisation denials and Factory 041 STOP/RELEASE.
7. Reviewer records a PASS/FAIL/BLOCKED report, preview URL, tested head SHA and rollback plan; Dominic's review and separate owner merge/production approvals remain mandatory.

**Source review:** `frontend/src/app/business-energy-quote/health-check-page.tsx`, `frontend/src/components/website-leads/BusinessEnergyQuoteForm.tsx`, `frontend/src/lib/website-leads/validation.ts`, `frontend/src/app/business-energy-quote/actions.ts`. Related: GitHub issue #116 and draft PRs #114/#115.
