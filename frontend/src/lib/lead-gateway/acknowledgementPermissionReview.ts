/** Proposed wording for owner review and fictional staging records only.
 * These records are never Factory041 execution authority or customer consent. */
export const ACK_PERMISSION_PROPOSAL = {
  version: 'feh-ack-permission-review-v1',
  scope: 'fictional_staging_test_only',
  notice: 'Please contact me about my business energy enquiry. Free Energy Help may call me and send one SMS acknowledging this enquiry. I can reply STOP to stop automated texts.',
  message: 'Free Energy Help: Thanks for your enquiry. Dalbir will call from 01332 605506 during business hours. Reply STOP to stop automated texts.',
  rules: [
    'One acknowledgement for each fresh eligible enquiry from a verified FEH Meta, Instagram or Google form.',
    'Record the form and notice version, the submitted answer and time, and the provider enquiry identity.',
    'Hold enquiries with missing, refused, uncertain or conflicting permission for human review.',
    'Check customer opt-outs and the global sending stop before sending.',
    'Keep one durable attempt. Repeated events and uncertain provider results must never trigger a blind resend.',
    'Record enquiry contact permission separately from marketing permission.',
  ],
} as const;

export type MockPermission = 'yes' | 'no' | 'not_sure';
export type MockSource = 'meta' | 'google';
export function isMockPermission(value: unknown): value is MockPermission {
  return value === 'yes' || value === 'no' || value === 'not_sure';
}
export function isMockSource(value: unknown): value is MockSource {
  return value === 'meta' || value === 'google';
}
export function isMockTestId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const MOCK_PERMISSION_LABELS = {
  yes: 'Yes, please contact me about this enquiry and send one acknowledgement text.',
  no: 'No, I do not give permission for this contact.',
  not_sure: 'I am not sure. Please hold this for review.',
} as const;
