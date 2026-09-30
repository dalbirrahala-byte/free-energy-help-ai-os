# Utility Intent Radar source review — 30 September 2026

Draft internal note.

Review of current main found that generic company-newsroom, commercial-property and trade/local-press adapters currently reuse the ONLINE_DIRECT source label while carrying PUBLIC_WEB provenance. These source concepts should be separated before any broader integration work.

The existing Utility Intent Radar research path remains fail-closed: public evidence is reduced to inference, verification stays false, and outreach, enrichment, credit spend, sequence enrollment, promotion and CRM write remain disabled.

Next code change should introduce a distinct public-web signal source, keep it outside Apollo trigger sources, update adapter fixtures, and add regression tests proving public-web material cannot inherit OnlineDIRECT authority or contact permission.

No production data or external collection was used in this review.
