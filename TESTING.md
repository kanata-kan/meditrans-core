# TESTING.md — MediTrans Testing Suite

> Production-grade integration tests for the MediTrans medical transport system.
> Powered by **Vitest** against a **real PostgreSQL database** using seeded data.

---

## Architecture

```
tests/
├── setup.ts                      ← global beforeAll/afterAll (DB connect/disconnect)
├── helpers/
│   └── factories.ts              ← createTestUser, createTestClient, createBaseContext…
├── pricing/
│   ├── engine.test.ts            ← calculatePrice() — 20 tests
│   └── snapshot.test.ts          ← PricingSnapshot integrity — 7 tests
├── invoices/
│   └── invoice.test.ts           ← Invoice business rules — 5 tests
└── payments/
    └── payment.test.ts           ← Payment constraints — 8 tests
```

**Total: 40 tests** across 4 domains.

---

## Setup

### Prerequisites

- PostgreSQL running locally on port 5432
- `.env` with `DATABASE_URL` set
- DB seeded: `npm run db:seed`

### Install

```bash
npm install
```

Vitest and coverage tools are already in `devDependencies`.

---

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# Coverage report (target: 80%+)
npm run test:coverage

# Run a specific domain
npm run test:pricing
npm run test:invoices
npm run test:payments
```

---

## Test Strategy

### Isolation

Each test that writes to the DB:
1. Creates its own records with unique IDs (timestamp + random suffix)
2. Tracks all created IDs in local arrays
3. Deletes them in `afterEach` in **reverse FK order** (payments → lines → invoices → snapshots → services)

Tests that only **read** seeded data (catalog, rules, modifiers) do not write and need no cleanup.

### No Mocking

All tests run against the **real Prisma client** and **real PostgreSQL**. No mocked DB calls.
This ensures the pricing engine is tested exactly as it runs in production.

---

## Test Coverage

### `tests/pricing/engine.test.ts` — calculatePrice()

| # | Scenario | Expected |
|---|---|---|
| 1 | TRANSPORT_SIMPLE normal, 0km | base=150, TVA=15, total=165 |
| 2 | TRANSPORT_SIMPLE urgent, 0km | base=250, TVA=25, total=275 |
| 3 | TRANSPORT_URGENT catalog | base=300, total=330 |
| 4 | ECG 0km | base=200, total=220 |
| 5 | SUTURE | base=350, total=385 |
| 6 | 10km distance fee | distanceFee=75, total=247.50 |
| 7 | 0km distance | distanceFee=0 |
| 8 | 20km | distanceFee=150, total=330 |
| 9 | ECG with 50km (no requiresDistance) | distanceFee=0, total=220 |
| 10 | NIGHT_SURCHARGE active +100 MAD | subtotalHt=250, total=275 |
| 11 | NIGHT_SURCHARGE + 10km stacking | subtotalHt=325, total=357.50 |
| 12 | VIP_SURCHARGE (inactive) → NOT applied | total=165 (unchanged) |
| 13 | HOLIDAY_SURCHARGE (inactive) → NOT applied | total=165 (unchanged) |
| 14 | Unknown modifier code → ignored | total=165 |
| 15 | TVA = 10% of subtotalHt | tvaAmount = subtotalHt × 0.10 |
| 16 | breakdown has ≥ 4 lines | ✓ |
| 17 | matchedRuleIds non-empty | ✓ |
| 18 | Unknown catalog code | throws PricingCatalogNotFoundError |
| 19 | Catalog with no rules | throws PricingRuleNotFoundError |
| 20 | urgent=true, only normal rule exists | throws PricingRuleNotFoundError |
| 21 | Admin override valid reason | isOverridden=true, total=500 |
| 22 | Override stores overrideOriginalTotal | overrideOriginalTotal=165 |
| 23 | Non-admin override | throws PricingValidationError |
| 24 | Override without reason | throws PricingValidationError |
| 25 | Override reason < 10 chars | throws PricingValidationError |
| 26 | Override exactly 10 chars | succeeds |
| 27 | persist=true → snapshot in DB v1 | snapshotId > 0, version=1 |
| 28 | persist=false → no snapshot | snapshotId=0 |

### `tests/pricing/snapshot.test.ts` — Snapshot Integrity

| # | Scenario | Expected |
|---|---|---|
| 1 | First snapshot | version=1, isCurrent=true |
| 2 | Second calculation | latest isCurrent=true, others false |
| 3 | Admin override | old isCurrent=false, new version=2 |
| 4 | INVARIANT: exactly 1 isCurrent per service | count=1 |
| 5 | Two overrides | versions 1→2→3, only v3 is current |
| 6 | overrideOriginalTotal correctness | stored pre-override total |

### `tests/invoices/invoice.test.ts` — Invoice Rules

| # | Rule | Expected |
|---|---|---|
| 1 | CR-07: cancelled service | isEligible=false |
| 2 | CR-08: same service in 2 invoices | Prisma unique constraint error |
| 3 | CR-09: invoice total = sum of lines | sumTotal ≈ totalTtc |
| 4 | Invoice line references correct snapshot | line.snapshotId = snapshot.id |
| 5 | CR-12: cancel with payment | canCancel=false |

### `tests/payments/payment.test.ts` — Payment Constraints

| # | Scenario | Expected |
|---|---|---|
| 1 | Partial payment | paidTotal < totalTtc → status=partial |
| 2 | Full payment | paidTotal = totalTtc → status=paid |
| 3 | Two partial payments = full | paidTotal=totalTtc |
| 4 | Overpayment | isOverpayment=true → rejected |
| 5 | CR-12: payment exists → cannot cancel | canCancel=false |
| 6 | Zero payments → CAN cancel | canCancel=true |
| 7 | Zero amount is invalid | isValidAmount(0)=false |
| 8 | Payment references correct invoiceId | payment.invoiceId = invoice.id |

---

## Business Rules Verified

| Code | Rule | Test File |
|---|---|---|
| CR-07 | Cancelled service cannot be invoiced | invoice.test.ts |
| CR-08 | Service cannot appear in 2 invoices | invoice.test.ts |
| CR-09 | Invoice total = sum of snapshot totals | invoice.test.ts |
| CR-12 | Cancel invoice blocked if payments exist | invoice.test.ts + payment.test.ts |
| — | Non-admin cannot override prices | engine.test.ts |
| — | Override requires reason ≥ 10 chars | engine.test.ts |
| — | Zero-price forbidden (no matching rule) | engine.test.ts |
| — | Inactive modifiers never applied | engine.test.ts |
| — | Night surcharge is manual only | engine.test.ts |
| — | Snapshot is append-only (version chain) | snapshot.test.ts |
| — | Exactly 1 isCurrent per service | snapshot.test.ts |

---

## Known Limitations / Future Tests

1. **TVA-exempt catalog** — All seeded catalogs have `tvaExempt: false`. To test exempt behavior, create a temporary catalog entry in the test (as done for `PricingRuleNotFoundError`).

2. **Service layer tests** — `service.service.ts` calls `calculatePrice` + creates DB records. An end-to-end test for `createServiceWithPricing()` would add coverage.

3. **applyOverrideAction** — The Server Action in `pricing.actions.ts` is not directly tested (requires a running Next.js context). The underlying DB logic is covered in `snapshot.test.ts`.

4. **concurrency** — Race conditions on snapshot `isCurrent` flag under concurrent writes are not tested. Recommend adding a DB-level unique partial index: `UNIQUE (service_id) WHERE is_current = true`.

---

## Coverage Target

```
Minimum: 80% lines / functions / branches
Current priority files:
  src/modules/pricing/pricing.engine.ts    ← CRITICAL, highest risk
  src/modules/pricing/pricing.utils.ts
  src/modules/pricing/pricing.repository.ts
```

Run `npm run test:coverage` to generate HTML report in `coverage/`.
