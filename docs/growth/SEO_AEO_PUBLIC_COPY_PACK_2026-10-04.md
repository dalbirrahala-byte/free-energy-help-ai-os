# FEH SEO/AEO Public Copy Pack — 4 October 2026

Status: DRAFT / FEATURE BRANCH ONLY / DO NOT PUBLISH

Purpose: keep the final public copy ready while the actual serving CMS/source for freeenergyhelp.co.uk remains unidentified.

## 1. Business energy contract renewal page

### Proposed H1

Business Energy Contract Renewal: What to Check Before Your Contract Ends

### Direct answer

If your business energy contract is approaching its end date, first confirm the contract end date, any notice requirements, your current annual consumption and meter details. Then compare available renewal and switching options before the fixed term ends. If a fixed-term contract has already expired, your account may be on out-of-contract rates, a rolling/evergreen arrangement or a deemed-rate contract depending on the circumstances and supplier terms.

### Seven-step section

1. Find your contract end date and notice requirements.
2. Check whether the account is fixed, variable, rolling/evergreen, out of contract or deemed.
3. Gather recent bills and annual consumption.
4. Check the electricity MPAN core and/or gas MPRN.
5. Compare relevant supplier offers, not only the unit rate.
6. Review standing charges, contract length, pass-through terms and broker/intermediary remuneration.
7. Record the agreed supplier, start date, rates and next renewal date.

### Contract-status distinction

- **Out-of-contract rates:** some suppliers move a business onto out-of-contract rates after a fixed-term contract ends without a new agreement.
- **Deemed-rate contract:** commonly applies when a business starts using energy at new premises without first agreeing a contract, and can also arise in certain supplier-of-last-resort circumstances.
- **Rolling / evergreen contract:** an ongoing arrangement that continues or renews under its contractual terms.

Do not describe these three statuses as interchangeable.

### FAQ

**Can I switch before my business energy contract ends?**
A switching window may open before the contract end date. Whether you can switch without charge depends on the existing contract and supplier terms.

**What happens if my fixed business energy contract expires?**
Depending on the supplier and contract, the account may move to out-of-contract rates, a rolling/evergreen arrangement or another applicable contract status.

**Is an out-of-contract rate the same as a deemed contract?**
No. They are separate contract/status concepts and should not be presented as synonyms.

**What information should I gather before comparing renewal options?**
Recent bills, annual consumption, contract end date, notice requirements, supply address and relevant meter-point identifiers are useful starting information.

**Does the domestic Ofgem price cap apply to normal business energy contracts?**
No. The domestic price cap does not generally cap standard non-domestic contract prices.

### CTA

Not sure what status your current contract is in? Request a Free Business Energy Health Check and FEH can review the information you provide before you decide what to do next.

### Structured-data rule

Visible FAQ wording and FAQPage JSON-LD must match exactly. Do not add FAQ schema for questions or answers that are not visibly displayed.

## 2. MPAN page

### Proposed H1

What Is an MPAN? Your Electricity Supply Number Explained

### Direct answer

An MPAN (Meter Point Administration Number) identifies an electricity supply point. The MPAN core is 13 digits and is normally shown on the bottom row of the electricity Supply Number box on a bill. Some bills display a wider 21-digit Supply Number structure around that 13-digit core. The meter serial number is different: it identifies the physical meter rather than the supply point.

### Key clarification

Use the terms consistently:
- **MPAN core:** 13-digit supply-point identifier.
- **Supply Number display:** the wider box sometimes shown on an electricity bill, which can contain 21 digits around the MPAN core.
- **Meter serial number:** identifier for the physical meter.

Avoid saying simply that "the MPAN is 21 digits".

### FAQ

**How many digits are in an MPAN?**
The MPAN core is 13 digits. Some electricity bills display it within a wider 21-digit Supply Number box.

**Is an MPAN the same as a meter serial number?**
No. The MPAN identifies the electricity supply point; the meter serial number identifies the physical meter.

**Does an MPAN change when the meter is replaced?**
A meter replacement does not normally change the supply-point identifier simply because the physical meter changes.

**Where can I find my MPAN?**
It is normally shown on an electricity bill in the Supply Number area. The 13-digit MPAN core is usually the bottom row.

**Can a business have more than one MPAN?**
Yes. A site or portfolio can have more than one electricity supply point.

## 3. MPRN page

### Proposed H1

What Is an MPRN? Your Gas Supply Number Explained

### Direct answer

An MPRN (Meter Point Reference Number) is the unique identifier for a gas supply point. Xoserve describes it as a six- to 10-digit number that appears on gas bills in Britain. It identifies the supply point rather than the physical gas meter.

### Key clarification

- **MPRN:** gas supply-point identifier, typically six to 10 digits.
- **Meter serial number:** identifies the physical gas meter.
- Replacing a meter does not by itself mean the supply-point identifier changes.

### FAQ

**How many digits are in an MPRN?**
Xoserve describes an MPRN as a six- to 10-digit number.

**Where can I find my MPRN?**
It is normally shown on a gas bill.

**Is an MPRN the same as the meter serial number?**
No. The MPRN identifies the supply point; the serial number identifies the physical meter.

**Can a business have more than one MPRN?**
Yes. Businesses with multiple gas supply points can have multiple MPRNs.

**Do I need an MPRN to compare business gas contracts?**
It is useful supply-point information and may be requested during quotation, switching or account-administration processes.

## 4. Health Check claims

Remove or rewrite unsupported market-wide prevalence claims such as:
- "Most UK business energy contracts auto-renew ..."
- any percentage/frequency claim that is not backed by a current authoritative source and a defined population/time period.

Prefer direct, supportable language:
"Business energy contracts can move onto different arrangements when a fixed term ends. The result depends on the supplier, contract terms and circumstances."

## 5. Phone-number QA

- Public FEH business number currently shown on the live contact page: 01332 605506.
- Replace visible placeholder-like uses of 01332 000000 where they could be mistaken for a real FEH telephone number.
- If 01332 000000 is deliberately an input example, label it clearly as an example or use a neutral placeholder pattern that cannot be mistaken for the business number.

## 6. Internal-link plan

Renewal page:
- link to Free Business Energy Health Check
- link to MPAN guide
- link to MPRN guide
- link to change-of-tenancy guidance where relevant

MPAN/MPRN pages:
- link back to Health Check
- link to renewal guidance
- link to business-energy quote/comparison route only after canonical target is confirmed

## 7. Canonical / route QA before release

Before publishing:
- identify the actual serving CMS/repository;
- confirm one canonical renewal URL;
- remove or redirect duplicate renewal routes only after route ownership is proven;
- verify visible page title, H1, canonical, breadcrumb and JSON-LD agree;
- confirm all phone numbers and CTA links;
- test form submission in preview/staging only;
- verify no production deployment occurs without human approval.

## Current authoritative evidence

Ofgem:
https://www.ofgem.gov.uk/your-energy-supply/how-manage-your-energy-supply/get-business-energy-contract
https://www.ofgem.gov.uk/your-energy-supply/how-manage-your-energy-supply/switch-your-business-energy-supplier
https://www.ofgem.gov.uk/guidance/change-tenancy-businesses

UK Power Networks:
https://www.ukpowernetworks.co.uk/i-already-have-electricity-domestic/disconnect/close-down-or-remove-an-mpan

Xoserve:
https://umbraco.xoserve.com/a-to-z/

## Claim boundary

This pack is factual draft copy. It does not claim that FEH can identify meter-point data from private industry databases without lawful/authorised access, does not promise savings, and does not imply whole-market comparison where FEH uses a panel.
