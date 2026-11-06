# Google Ads lead-form SMS permission — staging remediation packet (6 Nov 2026)

## Verified source state
- Google Ads account `553-034-0666`, saved lead-form asset `402325113451`: currently only `FULL_NAME`, `EMAIL`, `PHONE_NUMBER`, `COMPANY_NAME`. There is no independently recorded SMS permission answer in this Google source. Existing webhook export is not evidence of permission.
- PR #115 already includes `createFormPermissionCapture`, with an exact Google field key match using `user_column_data[].column_id` and a single `string_value`, and a private `record_permission` RPC. Disabled by default. Missing/conflicting permission must not be transformed into YES.
- Existing Google webhook credential was incidentally exposed in an accessibility label in the prior read-only inspection; replace in both endpoints before enabling testing. Never paste the credential into GitHub, logs, browser automation traces or chat.

## FEH proposed customer wording (owner/legal review required before external publication)
**Question:** May Free Energy Help Ltd send you text messages about your business energy enquiry, including an acknowledgement and requested follow-up?
**Options:** `Yes, I agree` / `No, please contact me by telephone or email instead`.
No prechecked affirmative choice. The enquiry remains submittable if the customer declines. Include the applicable privacy notice link. This question relates to the specified enquiry communications only, not promotional or unsolicited marketing. Assess and document UK PECR/GDPR basis and customer expectations before release; do not assert that every service SMS legally requires this particular opt-in.

## Form/editor decision and binding
1. Authorised Google Ads operator opens the saved lead-form asset in account `553-034-0666`. Confirm whether it can offer a *separate, non-preselected, explicitly worded two-option question* whose answer appears in the provider's **actual webhook** `user_column_data`. Record screenshots/field identifier without showing webhook keys or personal data.
2. If supported, edit/draft and review it **without activating campaigns**. Capture real `column_id` and the exact affirmative/negative `string_value` values from a synthetic webhook/test; do not guess that Google exports a free-text custom question under the label chosen in the editor.
3. Create the approved staging permission binding: correct form/campaign identity, exact question key, exact affirmative/negative values, notice text/version, provider provenance, source lead ID/time, pinned test contact, all reviewed before any SMS-capable rule. Configure `FEH_ACK_GOOGLE_PERMISSION_QUESTION_KEY` only to the verified actual `column_id`, alongside the reviewed binding ID. Existing capture requires `FEH_ACK_PERMISSION_CAPTURE_ENABLED=true` only after installation, source verification and security acceptance.
4. If Google Ads native lead forms cannot export a usable separate choice, **do not fabricate a yes**. Use the FEH-controlled first-party enquiry form as the approved permission-capture destination, keeping distinct Google campaign attribution and a verified source trail. Obtain separate approval for changing the ad destination/routing.
5. Preserve existing owner notification email and paused campaigns; rotate the compromised webhook key in Google and staging with authorised secure entry, validating equality without displaying values.

## Minimum staging acceptance (synthetic; no real SMS)
- `Yes`: exact verified question/one answer; eligible only with all other identity, role, owner-rule, suppression, STOP and expiry checks.
- `No`, omitted, duplicate question, multiple answer or wrong question identifier: no automated SMS; still one reviewable CRM lead.
- Replay/parallel/restart: one lead/reservation/permission evidence, no second attempt or provider call.
- STOP: authenticated opt-out blocks future/queued attempts, including after restart; START alone cannot silently reopen permission.
- Wrong key/form/campaign/phone, tampered notice, missing verified contact or stale owner rule: deny.
- Retain report links and actual form/export sample **redacted of all credentials and customer PII**.

## Safety boundaries
No production form change, ads activation, live SMS, STOP release, migration push, accepted-checkpoint change or merge is authorised by this packet. Factory 041 protected-path acceptance, Dominic's review of the new security diff and five hosted acceptance groups remain mandatory. Do not ask Dalbir to invent a source answer or manually write SQL.
