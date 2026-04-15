# 14 — Pre-Go-Live Requirements

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 14

## 14.1 TVA Category-Level Exemptions

**Status:** Pre-go-live business confirmation required. Does not block development.

- Default TVA rate confirmed at 10%
- Which `service_catalog` categories should be `tva_exempt = TRUE` requires accountant confirmation
- All categories start with `tva_exempt = FALSE`
- **Action:** Accountant review before first real invoice

## 14.2 Invoice Re-total on Post-Invoice Override

**Status:** Design decided. Implementation flagged.

- If admin applies override after invoice line exists, invoice totals must be recalculated
- Must execute as single `$transaction`
- **Action:** Implement in `pricing.service.ts`. Write integration test.

## 14.3 Invoice Cancellation with Existing Payments

**Status:** Closed. See CR-12.

- Cancellation blocked if `SUM(payments.amount) > 0`
- Returns typed error: `"Cette facture ne peut pas être annulée car des paiements ont déjà été enregistrés."`
- Refund workflow deferred to Phase 2

## 14.4 Concurrent Service Selection for Invoices

**Status:** Closed.

- Unique constraint on `invoice_lines.service_id` prevents double-assignment
- Application catches constraint violation: `"Le service #X a déjà été ajouté à une autre facture."`
