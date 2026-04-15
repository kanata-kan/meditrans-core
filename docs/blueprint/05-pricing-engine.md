# 06 — Pricing Engine Architecture

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 6

## What the Engine Is

The Pricing Engine is a **deterministic, stateless computation service** with one job: given a set of service parameters, compute the total price with a complete breakdown and persist it as an immutable snapshot.

```
Input:  { catalogCode, scheduledAt, isUrgent, distanceKm,
          staffType, durationHours, selectedModifiers[],
          manualOverride? }

Output: { basePrice, distanceFee, modifiers[], subtotalHt,
          tvaRate, tvaAmount, totalTtc, breakdown[], snapshotId }
```

The engine does not create invoices. It does not know about clients or payments. Its scope is: "given these service parameters, what is the price and how was it computed?"

## Why Pricing Is Database-Driven

| Problem with hardcoding | Production consequence |
|---|---|
| Price change requires a code deploy | Business decision requires dev involvement and downtime risk |
| Night/day logic in a function | Conditional drift across modules; no audit trail |
| Distance rate as a constant | Cannot vary by zone or client contract |
| TVA as a magic number | Cannot adapt to category-level exemptions or rate changes |
| No version history | Cannot reconstruct past invoice justification |

## Confirmed Pricing Configuration (Phase 1)

| Parameter | Value | Storage location |
|---|---|---|
| Distance rate | 7.50 MAD/km | `pricing_distance_rates` — single active row |
| Default TVA rate | 10% | `system_config.DEFAULT_TVA_RATE = 0.10` |
| SUTURE default price | 350 MAD, manual override supported | `pricing_rules` — single rule with notes |
| Night surcharge | +100 MAD flat (optional, manual) | `pricing_modifiers.NIGHT_SURCHARGE` |

## Manual Price Override

Manual override is an **explicit, auditable admin capability**. Rules:

- Accessible only to users with role `admin`
- A reason string is mandatory
- Both the computed price and the override price are stored in the snapshot
- The overriding admin's user ID is recorded
- The override applies to the **total TTC** of the service

## Pricing Data Tables

- **`service_catalog`** — Stable identity of every billable service type. Holds behavioral flags. Never holds prices.
- **`pricing_rules`** — Base price per service type (urgency, staff type, duration). Row-per-context model.
- **`pricing_modifiers`** — Optional flat or multiplicative adjustments (NIGHT_SURCHARGE, VIP, HOLIDAY, etc.)
- **`pricing_distance_rates`** — Per-kilometer rates by zone. Phase 1: 7.50 MAD/km.
- **`pricing_snapshots`** — Append-only audit table. Never updated.

## Rule Specificity

Specificity score = count of non-null condition columns. Higher score wins. Ties broken by `valid_from DESC`.

## Calculation Algorithm (9 Steps)

```
FUNCTION calculatePrice(input: PricingInput, userId: number, opts: { persist: boolean }): PricingResult

  STEP 1 — Resolve catalog entry
  STEP 2 — Resolve base price (most specific matching rule)
  STEP 3 — Distance fee (if catalog.requires_distance AND distanceKm > 0)
  STEP 4 — Apply selected modifiers (flat_add or multiplier)
  STEP 5 — TVA (10% default, 0% if tva_exempt)
  STEP 6 — Manual override (admin only, reason mandatory)
  STEP 7 — Persist snapshot (if persist=true)

  RETURN PricingResult
```

## Price Preview (UX-Critical)

Before confirming service creation, the UI calls `previewPriceAction` with `persist: false`. The user sees the computed breakdown before the service is saved.

## SUTURE Pricing Behavior

- Default rule: 350 MAD (midpoint)
- Admin manual override for exceptional cases
- Override stored alongside original computation

## Engine Design Rules (Non-Negotiable)

1. Engine reads rules and computes. It does not create invoices or modify service records.
2. `pricing_snapshots` is append-only and versioned.
3. Every price is the result of a database query. No hardcoded price constant.
4. Most specific matching rule always wins. Zero-price fallback is forbidden.
5. Manual overrides are admin-only, require a reason, and log both totals.
6. Night surcharge is an optional flat modifier, manually selected.
7. TVA rate defaults to 10%. Categories flagged `tva_exempt = TRUE` use 0%.
8. Every failure throws a named, typed error.
9. TVA rate and NIGHT_SURCHARGE value are read from database at runtime.
