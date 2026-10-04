# Public signal source status — 4 October 2026

Internal research note. No production collection, credentials, CRM writes, enrichment or outreach.

## Companies House

Status: credential-gated for API acquisition.

Current official guidance states:
- API requests require authentication;
- most public-resource GET requests use an API key;
- API keys should not be stored in source code/source trees;
- standard rate limit is 600 requests per five minutes;
- applications attempting to bypass limits may be banned.

FEH action:
- keep live API acquisition blocked until a separately approved credential transport exists;
- never create or rotate credentials in an overnight build;
- use filing evidence only as a company-event research input, not proof of tenancy, energy demand or contact permission.

## Planning Data

Status: suitable for bounded public research, with material coverage limitations.

Current official documentation supports monitoring planning applications and recommends polite rate limiting. The planning-application specification is still in development and local authorities are not currently required to provide application data to it.

Current planning-application dataset page reports:
- 100,627 records;
- no data providers;
- collector last ran 17 September 2025;
- new data last found 17 September 2025;
- origin is MHCLG-created data intended to be replaced with authoritative sources.

FEH action:
- retain Planning Data as weak/aggregate discovery context;
- do not describe it as current authoritative local-authority evidence;
- prefer separately reviewed authority-level evidence before any strong company conclusion;
- no high-volume polling; bulk snapshots are preferable when scale is later approved.

## Find a Tender / Contracts Finder

Status: legitimate official open-contracting sources.

Current GOV.UK / Find a Tender documentation states:
- notice data is available under the Open Government Licence;
- Find a Tender exposes OCDS 1.1.5 JSON packages;
- the release API can filter by dates/stage and paginate by cursor;
- Contracts Finder also exposes OCDS outputs.

FEH action:
- treat published energy/procurement notices as procurement context;
- preserve notice identifier / OCID, publication date, buyer identity and exact source;
- do not infer a private company's energy renewal from an unrelated public tender;
- dedupe on stable notice/process identifiers rather than headlines.

## BICS

Status: macro context only.

ONS Wave 164 was released 24 September 2026; next release is 8 October 2026. BICS provides weighted aggregate estimates about business conditions.

FEH action:
- use BICS to explain sector context or tune human research priority only;
- never manufacture a company-level trigger, contact permission or Apollo eligibility from BICS.

## Combined boundary

A source can be public and still be unsuitable for automated commercial action. The progression remains:

public evidence -> provenance-preserving research record -> dedupe/freshness/compliance checks -> human review -> separately verified identity and lawful contact route -> separate Apollo/CRM gate.

No source above independently authorises outreach.
