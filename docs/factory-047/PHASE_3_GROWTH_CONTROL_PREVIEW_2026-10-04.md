# Factory 047 Phase 3 — FEH Live Growth Control Preview

Status: preview-only construction. No production deployment, no external sends, no spend, no new database writes.

## Purpose

Bring the "live dashboard" idea directly into FEH Mission Control instead of creating another standalone reporting product.

Phase 3 intentionally uses only data Mission Control already has and labels every missing external feed honestly.

## Preview scope

The FEH Live Growth Control panel will show:

- evidence-state greeting / daily briefing;
- live CRM leads, customers, tasks due today and renewals due;
- pipeline pulse (open / won / lost / total);
- top proven attention item;
- growth-data connection status for:
  - CRM;
  - Website & Health Check analytics;
  - Paid Ads;
  - Social;
  - SEO/AEO;
  - Apollo / outbound.

Only CRM is allowed to appear live from current Mission Control facts. External growth sources remain "Not connected" until a real read-only data source is wired and tested.

## Safeguards

The panel grants no execution capability. It cannot:

- enrich a contact;
- create or update a lead;
- send email, WhatsApp or social messages;
- publish content;
- activate or spend advertising budget;
- enroll an Apollo sequence;
- bypass suppression, RLS or approval controls.

## Next phases

1. Wire verified campaign/lead attribution already present in the CRM.
2. Add read-only channel analytics feeds one at a time.
3. Compute cost per qualified opportunity only when real spend + qualification evidence exists.
4. Add trend/freshness alerts.
5. Preserve "Not connected" rather than filling gaps with demo metrics.
