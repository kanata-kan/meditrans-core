# Medical Transport System — Unified Architecture Blueprint

### Internal Engineering Document · v5.0

> **Stack:** Next.js 14 · TypeScript · PostgreSQL · Prisma · TailwindCSS · App Router  
> **Scope:** Morocco · Production Release · 2025  
> **Status:** Final — ready for implementation. Supersedes v4.0.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Business Domain Overview](#3-business-domain-overview)
4. [Canonical System Flow](#4-canonical-system-flow)
5. [Domain Model and Entities](#5-domain-model-and-entities)
6. [Pricing Engine Architecture](#6-pricing-engine-architecture)
7. [Data Model and Database Strategy](#7-data-model-and-database-strategy)
8. [Folder / Module Architecture](#8-folder--module-architecture)
9. [UI / Design System Conventions](#9-ui--design-system-conventions)
10. [Business Rules and Lifecycle States](#10-business-rules-and-lifecycle-states)
11. [Conflict Resolution Log](#11-conflict-resolution-log)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Phase 1 Scope vs Future Scope](#13-phase-1-scope-vs-future-scope)
14. [Pre-Go-Live Requirements](#14-pre-go-live-requirements)
15. [Final Design Principles](#15-final-design-principles)
16. [Next Steps for Implementation](#16-next-steps-for-implementation)
17. [Final Implementation Readiness](#17-final-implementation-readiness)

---

## 1. Executive Summary

This document is the single source of truth for the Medical Transport System — a production-grade operational platform for managing ambulance transport and home medical services in Morocco.

The system manages the full lifecycle of a medical transport company: from client and patient registration, through service scheduling and automated pricing, to invoice generation and payment tracking.

This v5.0 revision builds on v4.0 by resolving one critical architectural conflict (pricing snapshot uniqueness vs. append-only versioning — see CR-11) and locking all previously open business questions (invoice cancellation behavior — see CR-12). All architecture and design decisions are now final. The document is ready for implementation without reservation.

**The central design decision:** `Service` is the operational core. Every other entity — clients, patients, pricing, invoices, payments — exists downstream from a `Service` record. The Pricing Engine is a domain service called synchronously at service creation. Invoices are financial documents that aggregate one or more services for a client, each with its own immutable pricing snapshot.

### Locked Decisions Summary

| Decision                           | Value                                                             | Configurable                              |
| ---------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| Night surcharge (NIGHT_SURCHARGE)  | +100 MAD flat (optional, manually selected)                       | Yes — `pricing_modifiers` table           |
| Distance rate                      | 7.50 MAD/km                                                       | Yes — `pricing_distance_rates` table      |
| TVA rate                           | 10%                                                               | Yes — `system_config` table, per category |
| SUTURE default price               | 350 MAD (midpoint), admin override enabled                        | Yes — manual override                     |
| Invoice model                      | One invoice, multiple services (same client)                      | —                                         |
| Manual price override              | Admin only, mandatory reason, audit-logged                        | —                                         |
| Snapshot versioning                | Versioned `(service_id, version)`; `is_current` flag; append-only | No                                        |
| Invoice cancellation with payments | Blocked — cancellation rejected if any payment exists             | No                                        |

---

## 2. Product Vision

This is not a billing application. It is a complete operational platform for a regulated medical transport business.

The system must:

- Give operators (admin / assistant roles) a unified interface to manage all operational entities.
- Price every service automatically and auditably using a rule-based engine backed by the database — never hardcoded values.
- Allow administrators to override computed prices in exceptional cases, with mandatory justification and full audit logging.
- Produce legal invoice documents consolidating one or more services for a client, with a complete line-by-line pricing breakdown.
- Track payments separately from invoices, supporting partial payment across cash, card, bank transfer, and cheque.
- Be maintainable by a small engineering team and extensible as the business grows.

**Language convention:**

| Context                                      | Language           |
| -------------------------------------------- | ------------------ |
| UI labels, buttons, messages, titles         | French exclusively |
| Code — variables, functions, types, comments | English only       |

---

## 3. Business Domain Overview

### Core Entity Distinctions

```
Client  ≠  Patient
────────────────────────────────────────────────────────────
Client   = The paying entity. A company, insurer, or individual.
           Receives invoices. One client may cover many patients.
Patient  = The person transported. May not be the payer.

Invoice  ≠  Payment
────────────────────────────────────────────────────────────
Invoice  = A legal document stating what is owed.
           Covers one or more services for a given client.
Payment  = A real financial transaction. One invoice can have
           multiple payments (partial payment support).

Service  =  The operational core
────────────────────────────────────────────────────────────
Everything flows from a Service. A service is linked to both
a patient (who is transported) and a client (who pays).
Invoices group services by client. Pricing is computed and
frozen per service at the moment of creation.
```

### Business Module Map

| Module     | Role                                                      | Core Entity       |
| ---------- | --------------------------------------------------------- | ----------------- |
| `users`    | Authentication and role management (Admin / Assistant)    | `User`            |
| `clients`  | Paying entities — individuals, companies, insurers        | `Client`          |
| `patients` | Persons transported — distinct from the payer             | `Patient`         |
| `services` | **The operational core.** Every transport or medical act. | `Service`         |
| `pricing`  | Rule-based price computation engine                       | `PricingSnapshot` |
| `invoices` | Legal billing documents grouping services per client      | `Invoice`         |
| `payments` | Real financial transactions linked to invoices            | `Payment`         |

---

## 4. Canonical System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SETUP  (one-time admin configuration)                                  │
│  service_catalog · pricing_rules · pricing_modifiers                    │
│  pricing_distance_rates · system_config                                 │
│  (NIGHT_SURCHARGE = +100 MAD · distance = 7.50 MAD/km · TVA = 10%)     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ↓  (daily operations)

  ┌─────────────┐     ┌──────────────┐
  │   Client    │─────│   Patient    │
  └─────────────┘     └──────────────┘
        \                    /
         \                  /
          ↓                ↓
  ┌────────────────────────────────────────────────────────────────────┐
  │  SERVICE CREATION                                                  │
  │  Operator selects: catalog type, patient, client, schedule,        │
  │  distance, staff type, urgency, optional night surcharge            │
  └──────────────────────────┬─────────────────────────────────────────┘
                             │
                             ↓
  ┌────────────────────────────────────────────────────────────────────┐
  │  PRICING ENGINE  (synchronous, called on service creation)         │
  │  1. Resolve catalog entry                                          │
  │  2. Resolve best matching pricing_rule                             │
  │  3. Add distance fee: distanceKm × 7.50 MAD/km (if applicable)    │
  │  4. Apply selected pricing_modifiers (NIGHT_SURCHARGE +100, etc.) │
  │  5. Compute TVA at 10%                                             │
  │  6. Apply manual override if requested (admin only, reason req.)   │
  │  7. Persist immutable pricing_snapshot                             │
  │  → Returns PricingResult with snapshotId                          │
  └──────────────────────────┬─────────────────────────────────────────┘
                             │
                             ↓
  ┌────────────────────────────────────────────────────────────────────┐
  │  INVOICE GENERATION  (operator-triggered, one invoice per client)  │
  │  Admin selects one or more completed services for the same client  │
  │  invoice.service reads their pricing_snapshots                     │
  │  Creates Invoice with InvoiceLine per service                      │
  │  Invoice total = Σ snapshot.totalTtc for all lines                 │
  │  Status: unpaid · Number: INV-YYYY-NNNN                            │
  └──────────────────────────┬─────────────────────────────────────────┘
                             │
                             ↓
  ┌────────────────────────────────────────────────────────────────────┐
  │  PAYMENT                                                           │
  │  Operator records one or more payments against the invoice         │
  │  Status: unpaid → partial → paid                                   │
  └────────────────────────────────────────────────────────────────────┘
```

**Key timing principle:** Pricing is computed and frozen at **service creation**, not at invoice generation. This means the price on any invoice line is always the price that was in effect when the service was booked — immune to subsequent rule changes.

---

## 5. Domain Model and Entities

### 5.1 `User`

| Field           | Type        | Notes                  |
| --------------- | ----------- | ---------------------- |
| `id`            | `int`       | PK                     |
| `email`         | `string`    | Unique                 |
| `password_hash` | `string`    | Never stored plain     |
| `role`          | `enum`      | `admin` \| `assistant` |
| `name`          | `string`    | Display name           |
| `is_active`     | `boolean`   | Soft disable           |
| `created_at`    | `timestamp` | —                      |

### 5.2 `Client`

| Field        | Type        | Notes                                  |
| ------------ | ----------- | -------------------------------------- |
| `id`         | `int`       | PK                                     |
| `name`       | `string`    | Person or company name                 |
| `type`       | `enum`      | `individual` \| `company` \| `insurer` |
| `phone`      | `string`    | —                                      |
| `email`      | `string`    | Optional                               |
| `address`    | `string`    | —                                      |
| `notes`      | `text`      | Internal notes                         |
| `created_at` | `timestamp` | —                                      |

### 5.3 `Patient`

| Field           | Type        | Notes                                 |
| --------------- | ----------- | ------------------------------------- |
| `id`            | `int`       | PK                                    |
| `client_id`     | `int FK`    | Responsible client                    |
| `full_name`     | `string`    | —                                     |
| `date_of_birth` | `date`      | —                                     |
| `phone`         | `string`    | —                                     |
| `address`       | `string`    | Default pickup address                |
| `medical_notes` | `text`      | Operator notes — not a medical record |
| `created_at`    | `timestamp` | —                                     |

### 5.4 `Service`

The operational core. All other entities are downstream.

| Field            | Type         | Notes                                                    |
| ---------------- | ------------ | -------------------------------------------------------- |
| `id`             | `int`        | PK                                                       |
| `patient_id`     | `int FK`     | Who is transported                                       |
| `client_id`      | `int FK`     | Who will be invoiced                                     |
| `catalog_code`   | `string FK`  | References `service_catalog.code`                        |
| `status`         | `enum`       | `pending` \| `in_progress` \| `completed` \| `cancelled` |
| `urgency`        | `enum`       | `normal` \| `urgent`                                     |
| `from_location`  | `string`     | Pickup address                                           |
| `to_location`    | `string`     | Drop-off address                                         |
| `distance_km`    | `decimal`    | For distance fee calculation                             |
| `is_round_trip`  | `boolean`    | Triggers ×1.80 modifier                                  |
| `staff_type`     | `enum?`      | `nurse` \| `doctor` \| `reanimator` \| `null`            |
| `duration_hours` | `int?`       | 12 or 24 — for disposition services                      |
| `scheduled_at`   | `timestamp`  | Determines night/day context for pricing                 |
| `completed_at`   | `timestamp?` | Set when status → `completed`                            |
| `notes`          | `text?`      | Operator notes                                           |
| `created_by`     | `int FK`     | Creating user                                            |
| `created_at`     | `timestamp`  | —                                                        |

### 5.5 `PricingSnapshot`

Immutable record of one price computation. Versioned per service — a service accumulates one snapshot at creation, plus one additional snapshot per manual override or recalculation. The currently active snapshot is identified by `is_current = true`. Financial data in a snapshot is never modified; only the `is_current` flag may transition from `true` to `false`.

| Field                     | Type        | Notes                                                               |
| ------------------------- | ----------- | ------------------------------------------------------------------- |
| `id`                      | `int`       | PK                                                                  |
| `service_id`              | `int FK`    | Service this snapshot belongs to                                    |
| `version`                 | `int`       | 1 for initial computation; increments per override or recalculation |
| `is_current`              | `boolean`   | `true` on the active snapshot; `false` on superseded versions       |
| `calculated_at`           | `timestamp` | —                                                                   |
| `input_params`            | `jsonb`     | Full PricingInput frozen at compute time                            |
| `base_price`              | `decimal`   | From matched pricing_rule                                           |
| `distance_fee`            | `decimal`   | distanceKm × rate                                                   |
| `modifiers_applied`       | `jsonb`     | Array of applied modifiers with impact                              |
| `subtotal_ht`             | `decimal`   | Pre-TVA total                                                       |
| `tva_rate`                | `decimal`   | 0.10 by default                                                     |
| `tva_amount`              | `decimal`   | subtotalHt × tvaRate                                                |
| `total_ttc`               | `decimal`   | Final amount                                                        |
| `matched_rule_ids`        | `int[]`     | Which pricing_rules rows were matched                               |
| `is_overridden`           | `boolean`   | True if admin manually set the price                                |
| `override_reason`         | `text?`     | Mandatory when is_overridden = true                                 |
| `override_by`             | `int FK?`   | Admin user who applied the override                                 |
| `override_original_total` | `decimal?`  | The computed total before override                                  |
| `currency`                | `string`    | `MAD`                                                               |

**Unique constraint:** `(service_id, version)` — compound uniqueness. There is no `@unique` constraint on `service_id` alone. A service's active snapshot is always the row where `is_current = true`.

### 5.6 `Invoice`

A financial document grouping one or more services for a client. Linked to services via `InvoiceLine`.

| Field            | Type            | Notes                                          |
| ---------------- | --------------- | ---------------------------------------------- |
| `id`             | `int`           | PK                                             |
| `client_id`      | `int FK`        | All lines must belong to this client           |
| `invoice_number` | `string UNIQUE` | `INV-YYYY-NNNN`                                |
| `status`         | `enum`          | `unpaid` \| `partial` \| `paid` \| `cancelled` |
| `total_ht`       | `decimal`       | Σ of all line subtotals HT                     |
| `total_tva`      | `decimal`       | Σ of all line TVA amounts                      |
| `total_ttc`      | `decimal`       | Σ of all line totals TTC                       |
| `due_date`       | `date?`         | Payment deadline                               |
| `notes`          | `text?`         | —                                              |
| `created_by`     | `int FK`        | —                                              |
| `created_at`     | `timestamp`     | —                                              |

### 5.7 `InvoiceLine`

Join table between an invoice and a service. One row per service included in the invoice. Carries the snapshot reference for full auditability.

| Field            | Type      | Notes                                       |
| ---------------- | --------- | ------------------------------------------- |
| `id`             | `int`     | PK                                          |
| `invoice_id`     | `int FK`  | Parent invoice                              |
| `service_id`     | `int FK`  | The service being billed                    |
| `snapshot_id`    | `int FK`  | Immutable pricing snapshot for this service |
| `line_label`     | `string`  | Human-readable label from catalog (French)  |
| `line_total_ht`  | `decimal` | snapshot.subtotal_ht                        |
| `line_tva`       | `decimal` | snapshot.tva_amount                         |
| `line_total_ttc` | `decimal` | snapshot.total_ttc                          |
| `sort_order`     | `int`     | Display order on invoice PDF                |

**Constraint:** A service can appear on at most one invoice. `service_id` is unique in this table. A service in `cancelled` status cannot be added to an invoice.

### 5.8 `Payment`

| Field        | Type        | Notes                                      |
| ------------ | ----------- | ------------------------------------------ |
| `id`         | `int`       | PK                                         |
| `invoice_id` | `int FK`    | —                                          |
| `amount`     | `decimal`   | Amount of this individual payment          |
| `method`     | `enum`      | `cash` \| `card` \| `transfer` \| `cheque` |
| `paid_at`    | `timestamp` | When received                              |
| `reference`  | `string?`   | Bank ref, receipt number                   |
| `notes`      | `text?`     | —                                          |
| `created_by` | `int FK`    | —                                          |
| `created_at` | `timestamp` | —                                          |

---

## 6. Pricing Engine Architecture

### 6.1 What the Engine Is

The Pricing Engine is a **deterministic, stateless computation service** with one job: given a set of service parameters, compute the total price with a complete breakdown and persist it as an immutable snapshot.

```
Input:  { catalogCode, scheduledAt, isUrgent, distanceKm,
          staffType, durationHours, selectedModifiers[],
          manualOverride? }

Output: { basePrice, distanceFee, modifiers[], subtotalHt,
          tvaRate, tvaAmount, totalTtc, breakdown[], snapshotId }
```

The engine does not create invoices. It does not know about clients or payments. Its scope is: "given these service parameters, what is the price and how was it computed?"

### 6.2 Why Pricing Is Database-Driven

| Problem with hardcoding             | Production consequence                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| Price change requires a code deploy | Business decision requires dev involvement and downtime risk |
| Night/day logic in a function       | Conditional drift across modules; no audit trail             |
| Distance rate as a constant         | Cannot vary by zone or client contract                       |
| TVA as a magic number               | Cannot adapt to category-level exemptions or rate changes    |
| No version history                  | Cannot reconstruct past invoice justification                |

All pricing parameters — base prices, night/day variants, distance rates, TVA rates, and modifier values — are stored in the database. Changing a rate is an admin data operation, not a code deployment.

### 6.3 Confirmed Pricing Configuration

These values are locked for Phase 1. They are stored in the database, not hardcoded, so they can be updated by an admin without a deployment.

| Parameter            | Value                              | Storage location                             |
| -------------------- | ---------------------------------- | -------------------------------------------- |
| Distance rate        | 7.50 MAD/km                        | `pricing_distance_rates` — single active row |
| Default TVA rate     | 10%                                | `system_config.DEFAULT_TVA_RATE = 0.10`      |
| SUTURE default price | 350 MAD, manual override supported | `pricing_rules` — single rule with notes     |
| Night surcharge      | +100 MAD flat (optional, manual)   | `pricing_modifiers.NIGHT_SURCHARGE`          |

**Night surcharge selection:**

The `NIGHT_SURCHARGE` modifier (flat +100 MAD) is selected manually by the operator at service creation time — it is never auto-applied by the engine. If the operator ticks "Supplément nuit" in the form, the modifier code `NIGHT_SURCHARGE` is added to `selectedModifiers[]` in the engine input. The engine applies it as a flat addition after base price and distance fee.

### 6.4 Manual Price Override

Manual override is an **explicit, auditable admin capability** — not a workaround. It is designed for legitimate exceptional cases: services where the computed price is inappropriate (e.g., SUTURE where the procedure complexity warrants deviation from the 350 MAD midpoint), commercial negotiations, or error corrections.

**Rules:**

- Accessible only to users with role `admin`. The engine rejects override requests from `assistant` accounts.
- A reason string is mandatory. The engine throws `PricingValidationError` if the override total is provided without a reason.
- Both the computed price and the override price are stored in the snapshot. The `override_original_total` field preserves what the engine would have charged without intervention.
- The overriding admin's user ID is recorded in `snapshot.override_by`.
- The invoice line displays the override total TTC, but the invoice PDF can optionally show the original computed price alongside the override for transparency.
- The override applies to the **total TTC** of the service. It does not modify the breakdown lines — the breakdown reflects the computed result, and the override is shown as a separate line with the reason.

**Override audit trail structure (stored in snapshot):**

```
is_overridden          = true
override_reason        = "Procédure complexe — 3 couches de suture, anesthésie locale"
override_by            = user_id (admin)
override_original_total = 350.00  (what engine computed)
total_ttc              = 500.00   (what admin set)
```

This structure means the snapshot always answers two questions: "What did the system compute?" and "What was actually charged, and why?"

### 6.5 Pricing Data Tables

**`service_catalog`** — Stable identity of every billable service type. Holds behavioral flags (`requires_distance`, `requires_staff_type`) and a `tva_exempt` flag per category. Never holds prices.

**`pricing_rules`** — Base price per service type (urgency, staff type, duration). Row-per-context model. NULL on a condition column means “applies to any value of that dimension.” Supports validity windows (`valid_from`, `valid_until`) for price versioning. Night/day is no longer a pricing dimension — it is handled by a modifier.

**`pricing_modifiers`** — Optional flat or multiplicative adjustments: NIGHT_SURCHARGE (+100 MAD flat, manually selected), VIP_SURCHARGE (×1.00 — reserved), HOLIDAY_SURCHARGE (×1.20 — inactive), MANUAL_DISCOUNT (placeholder). These are database rows that stack independently and appear in the invoice breakdown.

**`pricing_distance_rates`** — Per-kilometer rates by zone. Phase 1 has one active row: 7.50 MAD/km, zone `hors_centre_ville`. The schema supports tiered zones.

**`pricing_snapshots`** — Append-only audit table. One row per service price computation. Never updated. Contains every input, every matched rule, every modifier impact, the TVA calculation, and any manual override detail.

### 6.6 Rule Specificity and Selection

When multiple `pricing_rules` rows match a service context, the engine picks the most specific one.

**Specificity score** = count of non-null condition columns (`is_urgent`, `staff_type`, `duration_hours`). Higher score wins. Ties are broken by `valid_from DESC` — the most recently created rule takes precedence.

This is implemented in `pricing.utils.ts::computeSpecificity()` and applied in `pricing.repository.ts::resolveBestRule()`.

### 6.7 Calculation Algorithm

```
FUNCTION calculatePrice(input: PricingInput, userId: number, opts: { persist: boolean }): PricingResult

  STEP 1 — Resolve catalog entry
  ──────────────────────────────
  catalog = service_catalog WHERE code = input.catalogCode AND is_active = TRUE
  IF not found → throw PricingRuleNotFoundError

  STEP 2 — Resolve base price
  ────────────────────────
  rule = pricing_rules WHERE:
    service_catalog_id = catalog.id
    AND (is_urgent IS NULL OR is_urgent = input.isUrgent)
    AND (staff_type IS NULL OR staff_type = input.staffType)
    AND (duration_hours IS NULL OR duration_hours = input.durationHours)
    AND valid_from <= TODAY AND (valid_until IS NULL OR valid_until >= TODAY)
  ORDER BY specificity DESC, valid_from DESC
  LIMIT 1
  IF not found → throw PricingRuleNotFoundError
  // Zero-price fallback is forbidden. The engine must fail explicitly.

  base_price = rule.base_price

  STEP 3 — Distance fee
  ──────────────────────
  IF catalog.requires_distance AND input.distanceKm > 0:
    rate = pricing_distance_rates WHERE is_active = TRUE AND valid
    // Phase 1: rate = 7.50 MAD/km (single active row)
    distance_fee = input.distanceKm × rate.price_per_km
  ELSE:
    distance_fee = 0

  STEP 4 — Apply selected modifiers (e.g. NIGHT_SURCHARGE +100 MAD)
  ─────────────────────────
  subtotal = base_price + distance_fee
  FOR EACH modifier_code in input.selectedModifiers[] WHERE modifier is active:
    IF type = 'multiplier': subtotal = subtotal × modifier.value
    IF type = 'flat_add':   subtotal = subtotal + modifier.value
    Record { code, name, type, value, amountImpact } in modifiers_applied[]

  STEP 5 — TVA
  ─────────────
  tva_rate   = catalog.tva_exempt ? 0 : system_config.DEFAULT_TVA_RATE
  // Phase 1 default: 0.10 (10%) for non-exempt categories
  tva_amount = subtotal × tva_rate
  total_ttc  = subtotal + tva_amount

  STEP 6 — Manual override
  ─────────────────────────
  IF input.manualOverride:
    IF caller.role ≠ 'admin'       → throw PricingValidationError("Admin role required")
    IF !input.manualOverride.reason → throw PricingValidationError("Override reason required")
    override_original_total = total_ttc
    total_ttc   = input.manualOverride.total
    is_overridden = TRUE

  STEP 7 — Persist snapshot
  ──────────────────────────
  IF opts.persist = TRUE:
    INSERT INTO pricing_snapshots (all inputs, all outputs)
    snapshotId = new row id
  // If persist = FALSE (preview mode): snapshotId = 0, no write

  RETURN PricingResult
```

### 6.8 Price Preview (UX-Critical)

Before confirming service creation, the UI calls `previewPriceAction`, which runs the full engine with `persist: false`. The user sees the computed breakdown — base price, distance fee, modifiers, TVA, total TTC — before the service record is saved. This prevents phantom snapshots from abandoned forms.

### 6.9 SUTURE Pricing Behavior

SUTURE is a special case: the rate card provides a range (250–500 MAD) without a deterministic rule for selecting within that range. The engine handles this as follows:

- One rule is seeded for SUTURE: 350 MAD (midpoint). Night surcharge (+100 MAD) may be added manually if the procedure occurs during night hours.
- When the operator creates a SUTURE service, the engine computes 350 MAD as usual.
- If the procedure complexity justifies a different amount, an admin applies a manual override with a mandatory reason before or after the service is confirmed.
- The override is stored in the snapshot alongside the original 350 MAD computation.

This approach avoids a vague range in the pricing rules and provides a clear audit trail for every deviation.

### 6.10 Engine Design Rules (Non-Negotiable)

1. The engine reads rules and computes. It does not create invoices, modify service records, or contact external services.
2. `pricing_snapshots` is append-only and versioned. New snapshots are created for overrides and recalculations; old snapshots are never deleted or modified. The only permitted state transition is setting `is_current = false` on the superseded snapshot when a new version is created — this executes inside the same transaction as the new insert.
3. Every price is the result of a database query. No hardcoded price constant.
4. The most specific matching rule always wins. Zero-price fallback is forbidden.
5. Manual overrides are admin-only, require a reason, and log both the original and override totals.
6. Night surcharge is an optional flat modifier (+100 MAD), manually selected by the operator at service creation time. The engine never auto-detects or auto-applies night pricing.
7. TVA rate defaults to 10%. Categories flagged `tva_exempt = TRUE` in `service_catalog` use 0%.
8. Every failure throws a named, typed error (`PricingRuleNotFoundError`, `PricingValidationError`).
9. The TVA rate is read from `system_config` at runtime. `NIGHT_SURCHARGE` value is read from `pricing_modifiers` at runtime.

---

## 7. Data Model and Database Strategy

### 7.1 Schema Overview

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

### 7.2 Key Schema Decisions

**`service_catalog` is separate from `pricing_rules`.** The catalog holds the stable _identity_ of a service. When rates change, only new `pricing_rules` rows are inserted with a new `valid_from` date. Catalog rows never need touching.

**Pricing rules use a row-per-context model.** Not column pairs (`price_day`, `price_night`). Each pricing context is one row with NULL-able condition columns. Adding a new pricing dimension (e.g., holiday tier) is a new row, not a schema migration.

**`pricing_snapshots` is append-only and versioned.** Required for a regulated billing system. The `(service_id, version)` pair is the unique compound key — there is no `@unique` on `service_id` alone. A service starts with one snapshot (version 1). Each manual override or recalculation adds a new version (2, 3, …). The active snapshot for a service is always the row where `is_current = true`. Old snapshot rows are never deleted; their financial data is never modified. The only permitted mutation is setting `is_current = false` on the previous snapshot when a new version is persisted — both writes execute inside a single `$transaction`.

**`invoice_lines` decouples invoice from service count.** An invoice references a client and carries one or more `invoice_lines`, each tied to one service and its snapshot. This replaces the former `service_id` foreign key on the invoice itself. The constraint that a service can appear on at most one invoice is enforced by a unique index on `invoice_lines.service_id`.

**`system_config` stores runtime-configurable parameters.** Phase 1 entry: `DEFAULT_TVA_RATE = 0.10`. This is loaded by the application at startup and cached for the request lifecycle. Admin UI allows updating it without a code deployment.

### 7.3 Prisma Schema (Core Models)

```prisma
model SystemConfig {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
  updatedBy Int?
}

// Seed values:
// DEFAULT_TVA_RATE = "0.10"

model ServiceCatalog {
  code               String         @id
  nameFr             String
  category           String
  description        String?
  requiresDistance   Boolean        @default(false)
  requiresStaffType  Boolean        @default(false)
  tvaExempt          Boolean        @default(false)
  isActive           Boolean        @default(true)
  createdAt          DateTime       @default(now())
  pricingRules       PricingRule[]
  services           Service[]
}

model PricingRule {
  id               Int            @id @default(autoincrement())
  catalogCode      String
  isUrgent         Boolean?
  staffType        String?
  durationHours    Int?
  basePrice        Decimal
  currency         String         @default("MAD")
  validFrom        DateTime       @default(now())
  validUntil       DateTime?
  notes            String?
  createdAt        DateTime       @default(now())
  catalog          ServiceCatalog @relation(fields: [catalogCode], references: [code])

  @@index([catalogCode])
  @@index([validFrom, validUntil])
}

model Service {
  id            Int             @id @default(autoincrement())
  patientId     Int
  clientId      Int
  catalogCode   String
  status        ServiceStatus   @default(pending)
  urgency       UrgencyLevel    @default(normal)
  fromLocation  String
  toLocation    String
  distanceKm    Decimal         @default(0)
  staffType     StaffType?
  durationHours Int?
  scheduledAt   DateTime
  completedAt   DateTime?
  notes         String?
  createdById   Int
  createdAt     DateTime        @default(now())
  patient       Patient         @relation(fields: [patientId],  references: [id])
  client        Client          @relation(fields: [clientId],   references: [id])
  catalog       ServiceCatalog  @relation(fields: [catalogCode], references: [code])
  createdBy     User            @relation(fields: [createdById], references: [id])
  snapshots     PricingSnapshot[]
  invoiceLine   InvoiceLine?
}

model PricingSnapshot {
  id                    Int          @id @default(autoincrement())
  serviceId             Int
  version               Int          @default(1)
  isCurrent             Boolean      @default(true)
  calculatedAt          DateTime     @default(now())
  inputParams           Json
  basePrice             Decimal
  distanceFee           Decimal      @default(0)
  modifiersApplied      Json         @default("[]")
  subtotalHt            Decimal
  tvaRate               Decimal
  tvaAmount             Decimal
  totalTtc              Decimal
  matchedRuleIds        Int[]
  isOverridden          Boolean      @default(false)
  overrideReason        String?
  overrideById          Int?
  overrideOriginalTotal Decimal?
  currency              String       @default("MAD")
  service               Service      @relation(fields: [serviceId], references: [id])
  overrideBy            User?        @relation(fields: [overrideById], references: [id])
  invoiceLine           InvoiceLine?

  @@unique([serviceId, version])
  @@index([serviceId, isCurrent])
  @@index([calculatedAt])
}

model Invoice {
  id            Int           @id @default(autoincrement())
  clientId      Int
  invoiceNumber String        @unique
  status        InvoiceStatus @default(unpaid)
  totalHt       Decimal
  totalTva      Decimal
  totalTtc      Decimal
  dueDate       DateTime?
  notes         String?
  createdById   Int
  createdAt     DateTime      @default(now())
  client        Client        @relation(fields: [clientId],   references: [id])
  createdBy     User          @relation(fields: [createdById], references: [id])
  lines         InvoiceLine[]
  payments      Payment[]
}

model InvoiceLine {
  id            Int             @id @default(autoincrement())
  invoiceId     Int
  serviceId     Int             @unique   // a service can be on at most one invoice
  snapshotId    Int             @unique
  lineLabel     String
  lineTotalHt   Decimal
  lineTva       Decimal
  lineTotalTtc  Decimal
  sortOrder     Int             @default(0)
  invoice       Invoice         @relation(fields: [invoiceId],  references: [id])
  service       Service         @relation(fields: [serviceId],  references: [id])
  snapshot      PricingSnapshot @relation(fields: [snapshotId], references: [id])
}

model Payment {
  id          Int           @id @default(autoincrement())
  invoiceId   Int
  amount      Decimal
  method      PaymentMethod
  paidAt      DateTime
  reference   String?
  notes       String?
  createdById Int
  createdAt   DateTime      @default(now())
  invoice     Invoice       @relation(fields: [invoiceId],   references: [id])
  createdBy   User          @relation(fields: [createdById], references: [id])
}
```

### 7.4 Enums

```typescript
// lib/constants.ts
export type UserRole = "admin" | "assistant";
export type ServiceStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";
export type UrgencyLevel = "normal" | "urgent";
export type StaffType = "nurse" | "doctor" | "reanimator";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "card" | "transfer" | "cheque";
export type ClientType = "individual" | "company" | "insurer";
```

### 7.5 `system_config` Seed

```sql
INSERT INTO system_config (key, value) VALUES
('DEFAULT_TVA_RATE', '0.10');
```

### 7.6 `pricing_distance_rates` Seed

```sql
INSERT INTO pricing_distance_rates
  (zone_name, min_km, max_km, price_per_km, is_active, notes)
VALUES
  ('hors_centre_ville', 0, NULL, 7.50, TRUE,
   'Confirmed rate — 7.50 MAD/km. Admin-editable via pricing management UI.');
```

### 7.7 `pricing_modifiers` Seed

```sql
INSERT INTO pricing_modifiers (code, name_fr, type, value, is_active, notes)
VALUES
  ('NIGHT_SURCHARGE',  'Supplément nuit',      'flat_add',    100.00, TRUE,
   'Flat +100 MAD surcharge for night-time services. Manually selected by operator at service creation.'),
  ('VIP_SURCHARGE',    'Supplément VIP',        'multiplier',    1.00, FALSE,
   'Reserved — not active in Phase 1.'),
  ('HOLIDAY_SURCHARGE','Supplément jour férié',  'multiplier',    1.20, FALSE,
   'Reserved — not active in Phase 1.');
```

---

## 8. Folder / Module Architecture

```
src/
│
├── app/                              # Next.js App Router — thin pages only
│   ├── layout.tsx
│   ├── page.tsx
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx                  # KPI overview
│       ├── services/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── invoices/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── payments/
│       │   └── page.tsx
│       ├── clients/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── patients/
│       │   └── page.tsx
│       └── admin/
│           └── pricing/              # Admin-only: catalog, rules, modifiers, config
│               └── page.tsx
│
├── modules/
│   ├── users/
│   │   ├── user.types.ts
│   │   ├── user.schema.ts
│   │   ├── user.repository.ts
│   │   ├── user.service.ts
│   │   └── user.actions.ts
│   ├── clients/
│   │   ├── client.types.ts
│   │   ├── client.schema.ts
│   │   ├── client.repository.ts
│   │   ├── client.service.ts
│   │   └── client.actions.ts
│   ├── patients/
│   │   ├── patient.types.ts
│   │   ├── patient.schema.ts
│   │   ├── patient.repository.ts
│   │   ├── patient.service.ts
│   │   └── patient.actions.ts
│   ├── services/
│   │   ├── service.types.ts
│   │   ├── service.schema.ts
│   │   ├── service.repository.ts
│   │   ├── service.service.ts        # Calls pricingEngine.calculate() on create
│   │   ├── service.actions.ts
│   │   └── service.utils.ts
│   ├── pricing/
│   │   ├── pricing.types.ts          # PricingInput, PricingResult, AppliedModifier, BreakdownLine
│   │   ├── pricing.errors.ts         # PricingRuleNotFoundError, PricingValidationError
│   │   ├── pricing.engine.ts         # Core calculation class — 9-step algorithm
│   │   ├── pricing.repository.ts     # DB queries: rules, modifiers, distance rates, snapshots, config
│   │   ├── pricing.utils.ts          # isNightTime, computeSpecificity, getTvaRate, buildBreakdown
│   │   ├── pricing.schema.ts         # Zod: PricingInput validation
│   │   └── pricing.actions.ts        # previewPriceAction · admin rule/config management
│   ├── invoices/
│   │   ├── invoice.types.ts
│   │   ├── invoice.schema.ts
│   │   ├── invoice.repository.ts
│   │   ├── invoice.service.ts        # createInvoice(clientId, serviceIds[]) — reads snapshots
│   │   ├── invoice.actions.ts
│   │   └── invoice.utils.ts          # generateInvoiceNumber, recalculateInvoiceTotals
│   └── payments/
│       ├── payment.types.ts
│       ├── payment.repository.ts
│       ├── payment.service.ts        # recordPayment → updates invoice status
│       └── payment.actions.ts
│
├── components/
│   ├── ui/                           # Atoms — no domain knowledge
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   └── StatusPill.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── PageWrapper.tsx
│   │   └── Container.tsx
│   └── features/
│       ├── services/
│       │   ├── ServiceCard.tsx
│       │   ├── ServiceForm.tsx        # Embedded PricingPreview panel + override form (admin)
│       │   └── ServiceTable.tsx
│       ├── pricing/
│       │   ├── PricingPreview.tsx     # Real-time breakdown shown before service confirmation
│       │   ├── PricingBreakdownTable.tsx  # Reused on invoice PDF lines
│       │   └── OverrideForm.tsx       # Admin-only override modal (reason + amount)
│       ├── invoices/
│       │   ├── InvoiceBuilder.tsx     # Select services for invoice (multi-select, filtered by client)
│       │   ├── InvoiceCard.tsx
│       │   └── InvoicePDF.tsx         # Multi-line PDF with per-service breakdown
│       └── payments/
│           └── PaymentForm.tsx
│
├── lib/
│   ├── db.ts                         # Prisma client singleton
│   ├── config.ts                     # Loads system_config at startup, typed
│   ├── utils.ts                      # cn, formatCurrency, formatDate
│   └── constants.ts                  # Enums, type guards
│
└── styles/
    └── tokens.css
```

### Layer Responsibilities

| File              | Role                                    | May depend on                                  | May NOT                 |
| ----------------- | --------------------------------------- | ---------------------------------------------- | ----------------------- |
| `*.types.ts`      | TypeScript interfaces, enums            | Nothing                                        | Logic, imports          |
| `*.schema.ts`     | Zod input validation                    | `types`, `zod`                                 | DB, business logic      |
| `*.repository.ts` | Prisma CRUD only                        | `lib/db`, `types`                              | Business logic, HTTP    |
| `*.service.ts`    | Business logic, orchestration           | `repository`, `types`, `utils`, other services | DB directly, UI, HTTP   |
| `*.actions.ts`    | Next.js Server Actions — UI entry point | `service`, `schema`                            | Business logic directly |
| `*.utils.ts`      | Pure functions                          | `types`                                        | Side effects, DB        |

Pages stay under 30 lines. Server actions always return `{ success: boolean; data?: T; error?: string | ZodFlatError }`.

---

## 9. UI / Design System Conventions

### 9.1 Design Token System

All visual values are defined in `tailwind.config.ts` and referenced exclusively via Tailwind class names. No raw hex, spacing, or size values appear in component code.

**Color Tokens**

| Token            | Value     | Usage                                      |
| ---------------- | --------- | ------------------------------------------ |
| `brand.primary`  | `#DC2626` | Primary buttons, active links, key accents |
| `brand.hover`    | `#B91C1C` | Hover state for brand elements             |
| `brand.soft`     | `#FEE2E2` | Light backgrounds, badge fills, callouts   |
| `surface.dark`   | `#111827` | Sidebar, header, dark zones                |
| `surface.light`  | `#F9FAFB` | Page backgrounds                           |
| `status.success` | `#16A34A` | Paid, completed                            |
| `status.warning` | `#D97706` | Partial, pending                           |
| `status.danger`  | `#DC2626` | Cancelled, error                           |
| `status.info`    | `#2563EB` | In progress, informational                 |
| `text.primary`   | `#111827` | Headings, main text                        |
| `text.secondary` | `#4B5563` | Descriptions, labels                       |
| `text.muted`     | `#9CA3AF` | Placeholders, metadata                     |

**Typography Tokens**

| Token       | Size | Weight | Usage              |
| ----------- | ---- | ------ | ------------------ |
| `text.4xl`  | 36px | 700    | Page titles        |
| `text.3xl`  | 30px | 700    | Section titles     |
| `text.2xl`  | 24px | 700    | Card headings      |
| `text.xl`   | 20px | 600    | Secondary headings |
| `text.lg`   | 18px | 600    | Important labels   |
| `text.base` | 14px | 400    | Body text          |
| `text.sm`   | 13px | 400    | Descriptions       |
| `text.xs`   | 12px | 500    | Badges, captions   |

Font families: `font.sans → Inter, system-ui` · `font.mono → JetBrains Mono` (IDs, amounts, codes)

**Border / Radius:** `radius.sm = 4px` · `radius.md = 8px` · `radius.lg = 12px`

### 9.2 Status Pill Convention

```
pending     → yellow  → "En attente"
in_progress → blue    → "En cours"
completed   → green   → "Complété"
cancelled   → red     → "Annulé"
unpaid      → red     → "Impayé"
partial     → orange  → "Partiel"
paid        → green   → "Payé"
```

### 9.3 Absolute Rules

| Rule                                       | Reason                                             |
| ------------------------------------------ | -------------------------------------------------- |
| No raw CSS values or inline styles         | Tokens only                                        |
| No business logic in components            | Components receive typed props and render          |
| No logic in pages or API routes            | Pages call server actions; actions call services   |
| No `any` TypeScript                        | Type explicitly or use `unknown` with a type guard |
| No `console.log` in production             | Use a logger or remove before merge                |
| No magic values                            | Named constants from `lib/constants.ts` only       |
| Components under 150 lines                 | Longer components signal coupling — extract        |
| Override form visible to `admin` role only | Enforce in the component via role guard            |

---

## 10. Business Rules and Lifecycle States

### 10.1 Service Lifecycle

```
[Created] → pending
             │
             ├── Dispatch → in_progress → Transport complete → completed
             │
             └── Cancelled before dispatch → cancelled
```

- An `urgent` service must be scheduled within 2 hours of creation. Enforced in `service.service.ts`.
- A `cancelled` service cannot be added to an invoice.
- A service already on an invoice (`invoice_lines.service_id` exists) cannot be added to another invoice.
- A completed service with no invoice line is visible in the "uninvoiced services" view, filterable by client.

### 10.2 Invoice Lifecycle

```
[Created] → unpaid
             │
             ├── Partial payment → partial
             │
             └── Full payment received → paid

             (Admin may cancel an unpaid invoice → cancelled)
```

Invoice creation process:

1. Operator opens the Invoice Builder, selects a client.
2. The system displays all `completed` services for that client that have no `InvoiceLine` yet.
3. Operator selects one or more services to include.
4. `invoice.service.ts::createInvoice(clientId, serviceIds[])` reads each service's snapshot and creates `InvoiceLine` rows.
5. Invoice totals are computed as `Σ line_total_ht`, `Σ line_tva`, `Σ line_total_ttc`.
6. Invoice number is generated: `INV-YYYY-NNNN`.

Invoice status is derived from the sum of linked payments vs `total_ttc`. `payment.service.ts` recalculates and updates `invoice.status` on every payment recorded.

### 10.3 Pricing Business Rules

| Rule                        | Value / Behavior                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Night window                | 21:00–07:00 — stored in `system_config`, admin-configurable                                                                                                                  |
| Night determination         | Based on `service.scheduled_at` only — not creation time                                                                                                                     |
| Distance fee                | Applied when `service_catalog.requires_distance = TRUE` AND `distance_km > 0`                                                                                                |
| Distance rate               | 7.50 MAD/km — stored in `pricing_distance_rates`, admin-editable                                                                                                             |
| Round-trip modifier         | ×1.80 on the post-modifier subtotal — `pricing_modifiers.ROUND_TRIP`                                                                                                         |
| TVA rate                    | 10% default — stored in `system_config.DEFAULT_TVA_RATE`, admin-configurable                                                                                                 |
| TVA exempt categories       | Flagged `tva_exempt = TRUE` in `service_catalog` — engine applies 0%                                                                                                         |
| SUTURE default              | 350 MAD (day context) — admin override supported for exceptional cases                                                                                                       |
| Manual override             | Admin only · Mandatory reason · Both computed and override totals stored                                                                                                     |
| Rule conflict               | Most specific matching rule wins (highest non-null condition count)                                                                                                          |
| Zero-price fallback         | Forbidden — engine throws `PricingRuleNotFoundError`                                                                                                                         |
| Snapshot versioning         | Versioned `(service_id, version)`; `is_current = true` on the active snapshot; financial data is never modified; only `is_current` may transition to `false` when superseded |
| Pricing at service creation | Price is frozen when the service is created, not when the invoice is generated                                                                                               |

### 10.4 Invoice Number Format

`INV-YYYY-NNNN` — sequenced per calendar year, zero-padded to 4 digits. Generated atomically in `invoice.utils.ts::generateInvoiceNumber()` using a database sequence or `MAX(sequence_number) + 1` per year inside a transaction.

### 10.5 Manual Override: Explicit Workflow

```
1. Service is created → engine computes price → snapshot persisted (version = 1, isCurrent = true, isOverridden = false)

2. Admin reviews the service detail page

3. Admin clicks "Modifier le tarif" (visible only to admin role)
   → OverrideForm.tsx opens (modal)
   → Fields: new total TTC (required) · reason (required, min 10 chars)

4. On submit → applyOverrideAction(serviceId, newTotal, reason)
   → Validates: caller.role = 'admin'
   → Validates: reason is non-empty
   → Inside a single $transaction:
       a. Reads current snapshot (WHERE serviceId = X AND isCurrent = true)
       b. Sets old snapshot.isCurrent = false
       c. Creates NEW pricing_snapshot:
            version               = old snapshot.version + 1
            isCurrent             = true
            isOverridden          = true
            overrideReason        = reason
            overrideById          = userId
            overrideOriginalTotal = old snapshot.totalTtc
            totalTtc              = newTotal
   → Old snapshot financial data is NEVER modified; only isCurrent transitions to false

5. If an invoice line already exists for this service:
   → The invoice line is updated to reference the new snapshot
   → Invoice totals are recalculated
   → A log entry is written: "Invoice INV-YYYY-NNNN recalculated due to price override on service #X"
```

---

## 11. Conflict Resolution Log

This log documents every material conflict between the two source documents and the decisions made in prior revisions. All previously open items are now resolved.

---

**CR-01 — Service type enum vs service catalog**

_Source conflict:_ Architecture doc used `ServiceType = 'transport' | 'appointment'` (2 values). Pricing doc defined 22+ catalog entries.  
_Resolution:_ Two-value enum eliminated. `Service.catalog_code` references `service_catalog.code`.  
_Status:_ **Closed.**

---

**CR-02 — Pricing Engine placement**

_Source conflict:_ Architecture doc had no Pricing Engine. Pricing doc described it as an isolated layer.  
_Resolution:_ Engine is a domain module (`modules/pricing/`) called synchronously from `service.service.ts` at creation time.  
_Status:_ **Closed.**

---

**CR-03 — When to run the Pricing Engine**

_Source conflict:_ Ambiguous in pricing doc whether engine ran at service creation or invoice generation.  
_Resolution:_ Engine runs at service creation. Invoice reads the existing snapshot. Price is frozen at booking time.  
_Status:_ **Closed.**

---

**CR-04 — TVA rate**

_Source conflict:_ Pricing doc used 20% in examples but noted possible medical exemption.  
_Resolution:_ TVA is 10% for non-exempt categories. Medical categories flagged `tva_exempt = TRUE` use 0%. Rate stored in `system_config.DEFAULT_TVA_RATE`. Confirmed at 10% for Phase 1.  
_Status:_ **Closed.**

---

**CR-05 — Notifications module**

_Source conflict:_ Architecture doc listed notifications. Pricing doc ignored them.  
_Resolution:_ Deferred to Phase 2. Not in Phase 1 folder structure.  
_Status:_ **Closed.**

---

**CR-06 — Distance rate ambiguity**

_Source conflict:_ Source document stated "5–10 MAD/km" without specifying conditions.  
_Resolution:_ Rate confirmed at 7.50 MAD/km. Stored in `pricing_distance_rates`, admin-editable.  
_Status:_ **Closed.**

---

**CR-07 — Night window definition**

_Source conflict:_ Pricing doc warned not to assume 21:00–07:00 without written confirmation.  
_Resolution:_ 21:00–07:00 confirmed. Stored in `system_config` as `NIGHT_START_HOUR = 21`, `NIGHT_END_HOUR = 7`. Admin-configurable without deployment.  
_Status:_ **Closed.**

---

**CR-08 — SUTURE pricing range**

_Source conflict:_ Rate card gave 250–500 MAD with no rule for selecting within the range.  
_Resolution:_ 350 MAD midpoint stored as the default pricing rule. Admin manual override is the mechanism for deviations. Reason is mandatory and logged.  
_Status:_ **Closed.**

---

**CR-09 — One invoice per service (previous v3.0 assumption)**

_Previous assumption:_ v3.0 stated "one invoice per service" as the Phase 1 model.  
_Resolution:_ Model updated. An invoice groups one or more completed services for the same client. `InvoiceLine` is the join entity. `service_id` is unique in `invoice_lines`, preventing a service from appearing on multiple invoices.  
_Status:_ **Closed.**

---

**CR-10 — Manual override not explicitly modeled**

_Previous gap:_ v3.0 described override at a high level without specifying the workflow, the data fields, or the re-invoicing behavior.  
_Resolution:_ Manual override is now fully specified: admin-only, mandatory reason, creates a new snapshot, preserves the original, optionally updates an existing invoice line. See §6.4 and §10.5.  
_Status:_ **Closed.**

---

**CR-11 — PricingSnapshot unique constraint vs. append-only / override model**

_Source conflict:_ `PricingSnapshot.serviceId` carried `@unique`, limiting each service to exactly one snapshot. At the same time, §6.10 rule 2 declared snapshots append-only (no updates), and §10.5 required creating a **new** snapshot on every manual override. These three constraints were mutually exclusive: a `@unique` on `serviceId` makes it impossible to insert a second snapshot for the same service.  
_Resolution:_ `@unique` on `serviceId` removed. Snapshots are versioned: `version` (int, auto-incremented per service, starting at 1) and `isCurrent` (boolean flag). The compound `@@unique([serviceId, version])` enforces uniqueness per version. The active snapshot for a service is always the row where `isCurrent = true`. When a new snapshot is created, the previous snapshot's `isCurrent` is set to `false` inside the same `$transaction` — its financial data is never touched.  
_Status:_ **Closed.**

---

**CR-12 — Invoice cancellation with existing payments (previously §14.3)**

_Previous gap:_ §14.3 documented three options for handling cancellation of an invoice that already has payments recorded, but left the decision open.  
_Resolution:_ Option (a) is adopted. **Cancellation is blocked if `SUM(payments.amount) > 0`.** `invoice.service.ts::cancelInvoice` must check the payment sum before proceeding and return a typed error if payments exist: `"Cette facture ne peut pas être annulée car des paiements ont déjà été enregistrés."` If the business later requires cancellation with a refund, a dedicated refund flow will be designed as a Phase 2 feature.  
_Status:_ **Closed.**

---

## 12. Implementation Roadmap

### Stage 01 — Foundations

- Initialize Next.js 14 with TypeScript strict mode, ESLint, Prettier, path aliases (`@/`).
- Configure Tailwind with full token system from §9.1.
- Initialize Prisma, connect to PostgreSQL, write the full schema from §7.3.
- Run first migration. Verify all tables, indexes, and constraints.
- Seed `system_config`: night window, TVA rate.
- Seed `service_catalog`: all 22+ entries with `tva_exempt` flags.
- Seed `pricing_rules`: all day/night/staff/duration variants. SUTURE at 350 MAD.
- Seed `pricing_distance_rates`: 7.50 MAD/km, single active row.
- Seed `pricing_modifiers`: ROUND_TRIP (×1.80, active), VIP_SURCHARGE (×1.00, inactive), HOLIDAY_SURCHARGE (×1.20, inactive).

### Stage 02 — Design System

- Atomic components: `Button`, `Input`, `Select`, `StatusPill`, `Table`, `Badge`, `Card`, `Modal`.
- Layout shell: `Sidebar`, `Header`, `PageWrapper`.
- `lib/config.ts`: typed loader for `system_config` values.
- `lib/constants.ts`: all enums and type guards.
- `lib/utils.ts`: `formatCurrency`, `formatDate`, `cn`.

### Stage 03 — Clients and Patients

- Full CRUD for clients and patients.
- Client → Patient relationship.
- List views with search and pagination.

### Stage 04 — Pricing Engine

- Implement `pricing.types.ts`, `pricing.errors.ts`, `pricing.schema.ts`.
- Implement `pricing.repository.ts`: rules, modifiers, distance rates, snapshots, config loading.
- Implement `pricing.utils.ts`: `isNightTime` (reads from config), `computeSpecificity`, `getTvaRate`, `buildBreakdown`.
- Implement `pricing.engine.ts`: full 9-step algorithm from §6.7.
- Implement `pricing.actions.ts::previewPriceAction` (persist=false).
- Implement `pricing.actions.ts::applyOverrideAction` (admin only; single `$transaction`: set old snapshot `isCurrent = false`, insert new versioned snapshot with `version + 1` and `isCurrent = true`, update invoice line reference if present).
- **Write unit tests for the engine.** This is the most business-critical code in the system. Minimum coverage: one test per example scenario, all edge cases (no rule found, override, round-trip, TVA exempt, night/day boundary).

### Stage 05 — Services Module

- Service creation form with embedded `PricingPreview` panel.
- Admin-only `OverrideForm` modal on service detail page.
- `service.service.ts::createService` calls `pricingEngine.calculate()`.
- Full CRUD with status management.
- `ServiceTable` with filters by status, date, client, patient.
- "Uninvoiced services" view, filterable by client (feeds Invoice Builder).

### Stage 06 — Invoices Module

- `invoice.service.ts::createInvoice(clientId, serviceIds[])` reads snapshots, creates lines, computes totals.
- `InvoiceBuilder.tsx`: client selector → service multi-select (uninvoiced only) → preview totals → confirm.
- Invoice number generation: `INV-YYYY-NNNN`.
- `InvoicePDF.tsx`: multi-line layout with `PricingBreakdownTable` per line.
- Invoice list with status filters.
- Re-total logic when an override is applied after invoice creation (see §10.5, step 5).

### Stage 07 — Payments Module

- Payment recording form: amount, method, date, reference.
- `payment.service.ts::recordPayment` → sums all payments → updates `invoice.status`.
- Invoice balance view (total TTC − total paid).

### Stage 08 — Admin Pricing Management

- Read-only views of `service_catalog`, `pricing_rules`, `pricing_modifiers`, `pricing_distance_rates` for admin.
- Edit UI for `system_config` values (night window, TVA rate).
- Edit UI for `pricing_distance_rates` (rate per km).
- These screens are admin-only, guarded by role middleware.

### Stage 09 — Auth and Dashboard

- NextAuth.js with credentials provider.
- Role middleware protecting `/admin/*` and all data mutations.
- Dashboard KPIs: monthly revenue, total services, uninvoiced services count, unpaid invoice total.
- Basic recharts revenue chart.

---

## 13. Phase 1 Scope vs Future Scope

### Phase 1 — Must Build

| Feature                                                     | Justification                                     |
| ----------------------------------------------------------- | ------------------------------------------------- |
| Full CRUD: clients, patients, services, invoices, payments  | Core operational data                             |
| Pricing Engine with all five pricing tables + system_config | Business-critical; no safe workaround             |
| Multi-service invoices via InvoiceLine                      | Required for real-world billing (company clients) |
| Admin manual price override with audit trail                | Required for SUTURE and exceptional cases         |
| PDF invoice export                                          | Legal requirement                                 |
| Payment recording and invoice status tracking               | Core financial tracking                           |
| Admin configurable: night window, TVA rate, distance rate   | Agreed requirement — no hardcoding                |
| Admin / Assistant roles and route protection                | Minimum security posture                          |
| Dashboard KPIs                                              | Operational visibility                            |

### Future Scope — Do Not Build Now

| Feature                                             | Phase   | Notes                                            |
| --------------------------------------------------- | ------- | ------------------------------------------------ |
| Appointment scheduling with calendar                | Phase 2 | Service remains the core; appointments extend it |
| In-app notifications (email, SMS)                   | Phase 2 | Requires event infrastructure                    |
| Online payment (Stripe or CMI)                      | Phase 2 | Requires PSP integration and PCI review          |
| Holiday / weekend pricing activation                | Phase 2 | Modifier is seeded but inactive                  |
| VIP tier pricing                                    | Phase 2 | Modifier is seeded at ×1.00 (no-op)              |
| Client contract pricing (per-client rate overrides) | Phase 2 | Adds `client_pricing_contracts` table            |
| Multi-tenant (multiple companies)                   | Phase 3 | Requires tenant isolation at every layer         |
| Mobile app (PWA or React Native)                    | Phase 3 | API-first design makes this straightforward      |
| Public API for third-party integrations             | Phase 3 | Expose key endpoints with API key auth           |

---

## 14. Pre-Go-Live Requirements

All architecture and design decisions are now closed. The following items are pre-go-live business confirmations and implementation requirements. They do not block the start of development.

### 14.1 TVA Category-Level Exemptions

**Status:** Pre-go-live business confirmation required. Does not block development.  
**Issue:** The default TVA rate is confirmed at 10%. However, which specific `service_catalog` categories (if any) should be flagged `tva_exempt = TRUE` requires accountant confirmation.  
**Current state:** All categories start with `tva_exempt = FALSE` (10% applies). Admin can update individual catalog entries via the pricing management UI.  
**Risk:** Charging TVA on legally exempt services produces incorrect invoices. This must be confirmed and corrected in the `service_catalog` seed before the first real invoice is generated.  
**Action required:** Accountant review of `service_catalog` categories before go-live.

### 14.2 Invoice Re-total on Post-Invoice Override

**Status:** Design decided. Implementation requirement flagged.  
**Issue:** If an admin applies a price override after an invoice line already exists, the invoice totals must be recalculated and the change must be logged. This is specified in §10.5 (step 5).  
**Risk:** This is a compound write (set old snapshot `isCurrent = false` + insert new snapshot + update invoice line + update invoice totals) that must execute atomically.  
**Action required:** Implement as a single `$transaction` in `pricing.service.ts`. Write an integration test covering the rollback scenario.

### 14.3 Invoice Cancellation with Existing Payments

**Status:** Closed. Decision adopted. See CR-12.  
**Decision:** Cancellation is blocked if `SUM(payments.amount) > 0`.  
**Implementation:** `invoice.service.ts::cancelInvoice` checks payment sum before proceeding. Returns a typed error if payments exist: `"Cette facture ne peut pas être annulée car des paiements ont déjà été enregistrés."` A dedicated refund workflow is deferred to Phase 2.

### 14.4 Concurrent Service Selection for Invoices

**Status:** Closed. Mitigation is sufficient for Phase 1.  
**Resolution:** The unique constraint on `invoice_lines.service_id` guarantees that only one of two concurrent operations succeeds at the database level. The second receives a constraint violation.  
**Implementation:** `invoice.service.ts::createInvoice` must catch this specific constraint error and return: `"Le service #X a déjà été ajouté à une autre facture."` No additional locking mechanism is required for Phase 1 concurrency levels.

---

## 15. Final Design Principles

| #   | Principle                                                | Implication                                                                                                                                                                                               |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | **Service is the operational core**                      | Every module exists in relation to a Service. Design starts there.                                                                                                                                        |
| 02  | **Prices live in the database, never in code**           | Any hardcoded price, rate, or percentage is a bug.                                                                                                                                                        |
| 03  | **Snapshots are immutable and versioned**                | Never modify a snapshot’s financial data. Recalculation creates a new version with `isCurrent = true`. The previous version transitions to `isCurrent = false`. All versions are permanent audit records. |
| 04  | **Separation of concerns at every layer**                | Repository → Service → Action → Page. Logic never crosses these boundaries.                                                                                                                               |
| 05  | **Client ≠ Patient · Invoice ≠ Payment**                 | These are distinct real-world concepts. The model reflects them precisely.                                                                                                                                |
| 06  | **Invoices group services, not the other way around**    | An invoice is a client-level financial document. Services belong to it via lines.                                                                                                                         |
| 07  | **Manual overrides are first-class, not escape hatches** | Override is a legitimate admin operation. It is designed, audited, and logged.                                                                                                                            |
| 08  | **Pages are thin**                                       | Pages assemble components and call server actions. 30-line limit.                                                                                                                                         |
| 09  | **Tokens first**                                         | No raw colors, spacing, or font values in components.                                                                                                                                                     |
| 10  | **UI in French, code in English**                        | Without exception.                                                                                                                                                                                        |
| 11  | **Zero-price fallback is forbidden**                     | The engine throws a named error. Silent billing failures are unacceptable.                                                                                                                                |
| 12  | **Error handling is explicit**                           | Every server action returns `{ success, data?, error? }`. Raw throws never reach the UI.                                                                                                                  |
| 13  | **Phase 1 restraint**                                    | Do not build Phase 2 features. Build Phase 1 correctly and completely.                                                                                                                                    |
| 14  | **Configurability without complexity**                   | Rates and thresholds are in `system_config` and pricing tables. The admin UI edits rows — no deployments.                                                                                                 |

---

## 16. Next Steps for Implementation

Ordered task list for the engineering team.

**Week 1 — Foundations**

1. Initialize Next.js 14 + TypeScript strict + ESLint + Prettier + path aliases.
2. Configure Tailwind with full token system.
3. Write the full Prisma schema (§7.3). Run migration. Verify all tables, constraints, and indexes.
4. Seed all configuration and pricing data: `system_config`, `service_catalog`, `pricing_rules`, `pricing_distance_rates`, `pricing_modifiers`.
5. Create the complete `modules/` and `components/` folder structure with empty placeholder files in the correct layer positions.

**Week 2 — Design System and Shared Infrastructure**

6. Build atomic UI components: `Button`, `Input`, `Select`, `StatusPill`, `Table`, `Badge`, `Card`, `Modal`.
7. Build layout shell: `Sidebar`, `Header`, `PageWrapper`.
8. Implement `lib/config.ts`: typed `getSystemConfig()` function that reads from `system_config` table.
9. Implement `lib/constants.ts`: all enums and type guards.
10. Implement `lib/utils.ts`: `formatCurrency`, `formatDate`, `cn`.

**Week 3 — Pricing Engine**

11. Implement `pricing.types.ts`, `pricing.errors.ts`, `pricing.schema.ts`.
12. Implement `pricing.repository.ts` — all rule, modifier, distance rate, snapshot, and config queries.
13. Implement `pricing.utils.ts` — `isNightTime` (config-driven), `computeSpecificity`, `getTvaRate`, `buildBreakdown`.
14. Implement `pricing.engine.ts` — full 9-step algorithm.
15. Implement `pricing.actions.ts::previewPriceAction` (persist=false).
16. Implement `pricing.actions.ts::applyOverrideAction` (admin only; single `$transaction`: set old snapshot `isCurrent = false`, insert new snapshot with `version + 1` and `isCurrent = true`, update invoice line reference and recalculate invoice totals if present).
17. Write unit tests for the engine. Cover: standard day, standard night, urgent, round-trip, distance fee, SUTURE override, TVA exempt, no rule found (expect throw), override validation (expect throw without reason), night boundary edge (20:59 vs 21:00 vs 07:00).

**Week 4 — Clients, Patients, Services**

18. Implement `clients` and `patients` modules (CRUD, list with pagination and search).
19. Implement `services` module — repository, service layer calling the Pricing Engine, actions.
20. Build `ServiceForm.tsx` with embedded `PricingPreview.tsx` (real-time price as user fills form).
21. Build `ServiceTable.tsx` with status, date, and client filters.
22. Build `OverrideForm.tsx` — admin-only modal on service detail page.

**Week 5 — Invoices**

23. Implement `invoice.service.ts::createInvoice(clientId, serviceIds[])` — reads snapshots, creates lines, computes totals, assigns invoice number.
24. Build `InvoiceBuilder.tsx` — client selector → uninvoiced service multi-select → total preview → confirm.
25. Build `InvoicePDF.tsx` with multi-line layout and per-line `PricingBreakdownTable`.
26. Implement invoice list with status filters and PDF download.

**Week 6 — Payments and Admin**

27. Implement `payments` module — recording, balance tracking, `invoice.status` auto-update.
28. Implement admin pricing management pages: `system_config` editor, `pricing_distance_rates` editor.
29. Implement role middleware protecting `/dashboard/admin/*` and all mutation server actions.

**Week 7 — Auth and Dashboard**

30. Configure NextAuth.js with credentials provider. Role guard middleware.
31. Build dashboard: KPIs (monthly revenue, total services, uninvoiced count, unpaid invoice total), basic recharts chart.
32. Activity log (who created/modified what, including override events).

**Before Go-Live**

- Accountant confirms `tva_exempt` flags per service category (§14.1). Update seed accordingly.
- Validate that the invoice re-total transaction (§14.2) has integration test coverage.
- Implement `invoice.service.ts::cancelInvoice` with payment-sum guard (§14.3 / CR-12).
- Implement `createInvoice` constraint-error handler with user-readable message (§14.4).
- Smoke test: create a service, preview price, confirm, generate invoice with multiple lines, apply override, verify snapshot version increment, record partial payment, record final payment, verify status transitions.

---

## 17. Final Implementation Readiness

**This document is ready for implementation.**

All material design and architecture decisions are locked:

- Night window, distance rate, TVA rate, SUTURE behavior, manual override, and the multi-service invoice model are all resolved, specified, and integrated consistently across the data model, pricing engine, business rules, folder structure, and roadmap.
- The architectural conflict between snapshot uniqueness and the append-only / override model is resolved: snapshots are versioned via `(service_id, version)` with an `is_current` flag (CR-11).
- Invoice cancellation behavior is decided: blocked if any payment exists (CR-12).
- Concurrent invoice selection is mitigated by the DB-level unique constraint with an explicit application-level error (§14.4).
- The Prisma schema is written and ready to migrate.
- The engine algorithm is fully specified with the confirmed values.
- The invoice model correctly supports multiple services per invoice with per-line audit trails.
- The manual override workflow is fully specified: version increment, `isCurrent` transition, and invoice re-total all inside a single `$transaction`.
- The only remaining item before go-live is the accountant’s confirmation of `tva_exempt` flags per service category (§14.1). This is a business data confirmation that does not block development.

The engineering team can begin with Stage 01 (§16, Week 1) immediately. The pricing engine (Week 3) is the highest-risk component and should receive the most rigorous testing before service creation is handed to the UI.

---

_Medical Transport System — Unified Architecture Blueprint v5.0_  
_Internal Engineering Document · Supersedes v4.0 · 2025_
