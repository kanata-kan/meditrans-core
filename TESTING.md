# TESTING.md — MediTrans Testing Suite

> Production-grade integration tests for the MediTrans medical transport system.
> Powered by **Vitest** against a **real PostgreSQL database** using seeded data.
> Hardened with stress, concurrency, integration, and security tests.

---

## Architecture

```
tests/
├── setup.ts                          ← global beforeAll/afterAll (DB connect/disconnect)
├── helpers/
│   └── factories.ts                  ← createTestUser, createTestClient, createBaseContext…
├── pricing/
│   ├── engine.test.ts                ← calculatePrice() — 29 tests
│   └── snapshot.test.ts              ← PricingSnapshot integrity — 6 tests
├── invoices/
│   └── invoice.test.ts               ← Invoice business rules — 5 tests
├── payments/
│   └── payment.test.ts               ← Payment constraints — 9 tests
└── hardening/
    ├── stress.test.ts                ← Stress & invalid inputs — 25 tests
    ├── concurrency.test.ts           ← Parallel writes & race conditions — 4 tests
    ├── integration.test.ts           ← Service-layer end-to-end flows — 13 tests
    └── security.test.ts              ← SQL injection, XSS, null, Zod — 22 tests
```

**Total: 113 tests | 8 test files | 100% pass rate**

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

# Coverage report
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

### Sequential Execution

Tests run sequentially (`fileParallelism: false`) to avoid cross-test DB conflicts.

---

## Core Test Coverage

### `tests/pricing/engine.test.ts` — calculatePrice() (29 tests)

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
| 28 | persist=true → returned ID matches DB | snap.totalTtc = 275 |
| 29 | persist=false → no snapshot | snapshotId=0 |

### `tests/pricing/snapshot.test.ts` — Snapshot Integrity (6 tests)

| # | Scenario | Expected |
|---|---|---|
| 1 | First snapshot | version=1, isCurrent=true |
| 2 | Second calculation | latest isCurrent=true, others false |
| 3 | Admin override | old isCurrent=false, new version=2 |
| 4 | INVARIANT: exactly 1 isCurrent per service | count=1 |
| 5 | Two overrides | versions 1→2→3, only v3 is current |
| 6 | overrideOriginalTotal correctness | stored pre-override total |

### `tests/invoices/invoice.test.ts` — Invoice Rules (5 tests)

| # | Rule | Expected |
|---|---|---|
| 1 | CR-07: cancelled service | isEligible=false |
| 2 | CR-08: same service in 2 invoices | Prisma unique constraint error |
| 3 | CR-09: invoice total = sum of lines | sumTotal ≈ totalTtc |
| 4 | Invoice line references correct snapshot | line.snapshotId = snapshot.id |
| 5 | CR-12: cancel with payment | canCancel=false |

### `tests/payments/payment.test.ts` — Payment Constraints (9 tests)

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
| 9 | Payment on one invoice does not affect another | paid2 = 0 |

---

## HARDENING++ Tests Added

### 1. Stress & Invalid Input Tests (`tests/hardening/stress.test.ts` — 25 tests)

**Distance stress:**
- Negative distanceKm (-10): Zod rejects at schema level
- Negative distanceKm passed directly: engine computes negative fee (proves Zod is mandatory upstream)
- Extremely large distance (1,000,000 km): engine computes 8,250,165 MAD without crash
- Fractional distance (0.001 km): correct computation, no rounding errors

**Override stress:**
- override.total = 0: Zod rejects (must be positive)
- override.total negative (-100): Zod rejects
- Extremely large override (999,999,999): engine accepts without crash/overflow
- Smallest valid amount (0.01): engine accepts
- Very long reason (1000 chars): engine processes safely

**Catalog code stress:**
- Empty string: Zod rejects
- Whitespace-only: engine throws PricingCatalogNotFoundError
- SQL injection string: throws PricingCatalogNotFoundError (safe)
- Very long string (500 chars): throws PricingCatalogNotFoundError

**Modifier stress:**
- 100 non-existent modifier codes: all ignored, total unchanged
- Empty string modifier: ignored
- Duplicate modifier codes: applied only once (DB deduplication)

**Zod schema edge cases (10 tests):**
- Missing required fields, wrong types (string "true" for boolean, string "10" for number)
- Invalid date string, invalid enum values, float for int, zero for positive
- Override reason boundary: 9 chars rejected, 10 chars accepted
- Valid input passes

### 2. Concurrency Tests (`tests/hardening/concurrency.test.ts` — 4 tests)

| # | Scenario | Invariant Verified |
|---|---|---|
| 1 | 2 parallel calculatePrice(persist=true) calls | Exactly 1 isCurrent=true, unique versions |
| 2 | 3 parallel calculatePrice calls | No duplicate versions, exactly 1 isCurrent |
| 3 | 2 parallel override transactions | Exactly 1 isCurrent after race |
| 4 | Parallel persist with different params | All totalTtc values finite (no NaN/Infinity) |

**How race conditions are handled:**
- Prisma's `$transaction` provides serializable isolation for snapshot writes
- The DB has a unique constraint `(service_id, version)` which prevents duplicate versions
- When 2 parallel writes race, the unique constraint causes one to fail → `Promise.allSettled` captures this
- The transaction pattern (find current → mark false → create new) is atomic within `$transaction`
- **Recommendation:** Add a partial unique index `UNIQUE (service_id) WHERE is_current = true` for belt-and-suspenders safety

### 3. Service Integration Tests (`tests/hardening/integration.test.ts` — 13 tests)

**createService flow (4 tests):**
- Creates service + pricing snapshot in one call
- Snapshot includes modifiers when selected (NIGHT_SURCHARGE)
- Urgent service scheduled >2h in future → throws scheduling error
- Invalid catalog code → throws pricing error

**createInvoice flow (4 tests):**
- Full flow: 2 completed services → invoice with correct total (412.50 MAD)
- Cancelled service → rejected with "annulé" error
- Already-invoiced service → rejected with "déjà été ajouté" error
- cancelInvoice succeeds when no payments exist

**recordPayment flow (4 tests + cancelInvoice guard):**
- Partial payment → invoice status auto-updated to 'partial'
- Full payment → invoice status auto-updated to 'paid'
- Payment on already-paid invoice → throws "déjà entièrement payée"
- Payment on cancelled invoice → throws "annulée"
- cancelInvoice with existing payment → blocked

### 4. Security-Oriented Tests (`tests/hardening/security.test.ts` — 22 tests)

**SQL injection resistance (3 tests):**
- SQL injection in catalogCode → safely throws PricingCatalogNotFoundError
- SQL injection in modifier codes → safely ignored (no modifiers applied)
- SQL injection in override reason → safely processed (Prisma parameterizes)

**XSS-like strings (2 tests):**
- `<script>` in catalogCode → throws PricingCatalogNotFoundError
- `<img onerror>` in modifier codes → safely ignored

**Null/undefined handling (6 tests):**
- null catalogCode, undefined isUrgent, null selectedModifiers → Zod rejects
- Object in string array → Zod rejects
- NaN/Infinity as distanceKm → Zod rejects

**applyOverrideSchema (6 tests):**
- Valid input passes
- Negative/zero serviceId, zero newTotal, short reason, float serviceId → Zod rejects

**Type guard functions (4 tests):**
- isUserRole, isServiceStatus, isInvoiceStatus, isPaymentMethod all validated

---

## Business Rules Verified

| Code | Rule | Test File(s) |
|---|---|---|
| CR-07 | Cancelled service cannot be invoiced | invoice.test.ts + integration.test.ts |
| CR-08 | Service cannot appear in 2 invoices | invoice.test.ts + integration.test.ts |
| CR-09 | Invoice total = sum of snapshot totals | invoice.test.ts + integration.test.ts |
| CR-12 | Cancel invoice blocked if payments exist | invoice.test.ts + payment.test.ts + integration.test.ts |
| — | Non-admin cannot override prices | engine.test.ts |
| — | Override requires reason ≥ 10 chars | engine.test.ts + stress.test.ts |
| — | Inactive modifiers never applied | engine.test.ts |
| — | Night surcharge is manual only | engine.test.ts + integration.test.ts |
| — | Snapshot is append-only (version chain) | snapshot.test.ts + concurrency.test.ts |
| — | Exactly 1 isCurrent per service | snapshot.test.ts + concurrency.test.ts |
| — | Urgent scheduling ≤ 2h window | integration.test.ts |
| — | Overpayment detection | payment.test.ts |
| — | Payment on cancelled/paid invoice blocked | integration.test.ts |

---

## Final Metrics

```
Total test files:    8
Total tests:         113
Pass rate:           100% (113/113)
Skipped:             0
Flaky:               0
Duration:            ~26s (sequential)
```

### Coverage by Module (Lines)

| Module | Lines | Stmts | Branch | Funcs |
|---|---|---|---|---|
| **pricing.engine.ts** | **94.64%** | 94.73% | 77.58% | 100% |
| **pricing.errors.ts** | **100%** | 100% | 50% | 100% |
| **pricing.utils.ts** | **100%** | 88.23% | 83.33% | 100% |
| **invoice.service.ts** | **84.21%** | 80.48% | 66.66% | 66.66% |
| **payment.service.ts** | **88.23%** | 83.33% | 80% | 50% |
| **service.utils.ts** | **100%** | 100% | 100% | 100% |
| **Overall** | **69.04%** | 66.81% | 62.12% | 35.71% |

> Critical pricing module: **91.76% composite coverage** — exceeds 90% target.

---

## Concurrency Guarantees

The system uses Prisma's `$transaction` for snapshot writes. Under concurrent pressure:

1. **Unique constraint `(service_id, version)`** prevents duplicate version numbers — tested with 2 and 3 parallel writes.
2. **`$transaction` atomicity** ensures the read-update-create pattern for snapshot versioning is not interleaved.
3. **`isCurrent` invariant** is maintained: after any number of parallel operations, exactly 1 snapshot per service has `isCurrent=true`.
4. **`Promise.allSettled`** captures rejected concurrent writes without crashing the test runner.

**Known limitation:** Without a partial unique index (`WHERE is_current = true`), a bug in application code could theoretically create 2 current snapshots. The current `$transaction` approach prevents this, but a DB-level constraint is recommended for defense-in-depth.

---

## Stress Test Results

| Extreme Value | System Behavior |
|---|---|
| distanceKm = -10 | Zod rejects; engine computes negative fee (upstream validation required) |
| distanceKm = 1,000,000 | Computes 8,250,165 MAD — no overflow, no NaN |
| distanceKm = 0.001 | Correct fractional computation |
| override.total = 999,999,999 | Accepted without crash |
| override.total = 0.01 | Accepted (smallest valid amount) |
| override.total = 0 | Zod rejects (must be positive) |
| override.total = -100 | Zod rejects |
| reason = 1000 chars | Accepted |
| catalogCode = SQL injection | Throws PricingCatalogNotFoundError |
| 100 fake modifier codes | All ignored, total unchanged |

---

## Engineering Notes

### Weak Points (remaining)

1. **clients, patients, users modules**: 0% coverage — no business logic to test yet (CRUD only, tested indirectly through factories).
2. **pricing.repository.ts**: 55% — functions `applyOverride` and `getSnapshotHistory` untested (called from `pricing.actions.ts` Server Actions, which require Next.js runtime).
3. **service.repository.ts**: 20% — list/find functions untested (UI-layer consumers).
4. **Overall branch coverage**: 62% — some defensive branches in untested modules.

### Future Improvements

1. Add partial unique index: `CREATE UNIQUE INDEX ON pricing_snapshots (service_id) WHERE is_current = true`
2. Test TVA-exempt catalog behavior (create temporary catalog in test)
3. Test Server Actions with mock Next.js context or extract logic into testable service functions
4. Add load testing with 50+ concurrent operations
5. Add Playwright E2E tests for the dashboard UI

---

Run `npm run test:coverage` to generate detailed HTML report in `coverage/`.
