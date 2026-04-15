# 04 — Canonical System Flow

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 4

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
