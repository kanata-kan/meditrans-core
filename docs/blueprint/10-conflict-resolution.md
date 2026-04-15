# 11 — Conflict Resolution Log

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 11

All conflicts between source documents are now resolved.

| CR | Issue | Resolution | Status |
|---|---|---|---|
| CR-01 | Service type enum vs catalog | Two-value enum eliminated. `Service.catalog_code` references `service_catalog.code` | **Closed** |
| CR-02 | Pricing Engine placement | Engine is a domain module called synchronously from `service.service.ts` | **Closed** |
| CR-03 | When to run Pricing Engine | At service creation. Invoice reads existing snapshot. | **Closed** |
| CR-04 | TVA rate | 10% for non-exempt. `tva_exempt = TRUE` → 0%. Stored in `system_config` | **Closed** |
| CR-05 | Notifications module | Deferred to Phase 2 | **Closed** |
| CR-06 | Distance rate ambiguity | 7.50 MAD/km confirmed. Admin-editable. | **Closed** |
| CR-07 | Night window definition | 21:00–07:00. Stored in `system_config`. Admin-configurable. | **Closed** |
| CR-08 | SUTURE pricing range | 350 MAD midpoint default. Admin override for deviations. | **Closed** |
| CR-09 | One invoice per service | Updated: invoice groups multiple services. `InvoiceLine` is join entity. | **Closed** |
| CR-10 | Manual override not modeled | Fully specified: admin-only, mandatory reason, new snapshot, preserves original. | **Closed** |
| CR-11 | PricingSnapshot unique constraint | `@unique` on `serviceId` removed. Versioned `(serviceId, version)`. | **Closed** |
| CR-12 | Invoice cancellation with payments | Cancellation blocked if `SUM(payments.amount) > 0`. | **Closed** |
