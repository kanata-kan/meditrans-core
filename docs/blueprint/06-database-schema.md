# 07 — Data Model and Database Strategy

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 7

## Schema Overview

```
system_config              (key/value: TVA rate)
users
clients ──────────────────< patients
clients ──────────────────< services
patients ─────────────────< services
service_catalog ───────────< pricing_rules
service_catalog ───────────< services
services ─────────────────< pricing_snapshots  (1:N, versioned · is_current flag)
clients ──────────────────< invoices
invoices ─────────────────< invoice_lines >───── services (unique service_id)
invoice_lines >────────────── pricing_snapshots (snapshot_id FK)
invoices ─────────────────< payments
pricing_modifiers          (standalone — referenced by engine)
pricing_distance_rates     (standalone — referenced by engine)
```

## Key Schema Decisions

- **`service_catalog` is separate from `pricing_rules`.** Catalog = identity. Rules = prices. Rate changes = new rows only.
- **Pricing rules use a row-per-context model.** Not column pairs. Each pricing context is one row with NULL-able condition columns.
- **`pricing_snapshots` is append-only and versioned.** `(service_id, version)` is the unique compound key.
- **`invoice_lines` decouples invoice from service count.** `service_id` is unique in `invoice_lines`.
- **`system_config` stores runtime-configurable parameters.** Admin can update without code deployment.

## Enums

```typescript
export type UserRole = "admin" | "assistant";
export type ServiceStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type UrgencyLevel = "normal" | "urgent";
export type StaffType = "nurse" | "doctor" | "reanimator";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "card" | "transfer" | "cheque";
export type ClientType = "individual" | "company" | "insurer";
```

## Seed Data

### system_config
```sql
INSERT INTO system_config (key, value) VALUES ('DEFAULT_TVA_RATE', '0.10');
```

### pricing_distance_rates
```sql
INSERT INTO pricing_distance_rates (zone_name, min_km, max_km, price_per_km, is_active, notes)
VALUES ('hors_centre_ville', 0, NULL, 7.50, TRUE, 'Confirmed rate — 7.50 MAD/km.');
```

### pricing_modifiers
```sql
INSERT INTO pricing_modifiers (code, name_fr, type, value, is_active, notes)
VALUES
  ('NIGHT_SURCHARGE',  'Supplément nuit',      'flat_add',    100.00, TRUE,  'Flat +100 MAD for night-time.'),
  ('VIP_SURCHARGE',    'Supplément VIP',        'multiplier',    1.00, FALSE, 'Reserved — Phase 2.'),
  ('HOLIDAY_SURCHARGE','Supplément jour férié',  'multiplier',    1.20, FALSE, 'Reserved — Phase 2.');
```
