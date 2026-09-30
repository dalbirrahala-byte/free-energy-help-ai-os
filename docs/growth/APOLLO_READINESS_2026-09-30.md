# Apollo readiness snapshot — 30 September 2026

DRAFT / READ-ONLY VERIFICATION

Read-only Apollo checks found one active default Microsoft Exchange sending mailbox. It had synced on 30 September 2026. No Apollo sequences/campaigns currently exist in the connected workspace.

Current credit snapshot reported 3,965 lead credits remaining in the active cycle. Direct-dial credits reported zero remaining. No credits were spent during this review.

The connected domain-authentication diagnostic action was not available for this account, so SPF/DKIM/DMARC health cannot be verified from the connector. Treat outbound deliverability readiness as AMBER until domain authentication is independently verified.

Overnight controls remain closed: no enrichment execution, no paid lookup, no sequence enrollment, no email send, no CRM write and no credit spend.

Recommended gate before any Apollo send pilot:
1. verify domain SPF/DKIM/DMARC through an approved evidence source;
2. confirm the default mailbox is the intended sender;
3. keep target records behind FEH suppression/compliance review;
4. use a small human-approved pilot, not bulk enrollment;
5. measure delivered, bounce, reply, spam-block and unsubscribe outcomes before scaling.
