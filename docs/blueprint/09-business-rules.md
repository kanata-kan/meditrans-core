# 10 — Business Rules and Lifecycle States

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 10

## Service Lifecycle

```
[Created] → pending
             │
             ├── Dispatch → in_progress → Transport complete → completed
             │
             └── Cancelled before dispatch → cancelled
```

- An `urgent` service must be scheduled within 2 hours of creation.
- A `cancelled` service cannot be added to an invoice.
- A completed service with no invoice line is visible in "uninvoiced services" view.

## Invoice Lifecycle

```
[Created] → unpaid
             │
             ├── Partial payment → partial
             │
             └── Full payment received → paid

             (Admin may cancel an unpaid invoice → cancelled)
```

Invoice creation process:
1. Operator selects a client
2. System displays all `completed` uninvoiced services for that client
3. Operator selects services to include
4. `createInvoice(clientId, serviceIds[])` reads snapshots, creates lines
5. Invoice number generated: `INV-YYYY-NNNN`

## Pricing Business Rules

| Rule | Value / Behavior |
|---|---|
| Night window | 21:00–07:00 — stored in `system_config` |
| Distance fee | Applied when `requires_distance = TRUE` AND `distance_km > 0` |
| Distance rate | 7.50 MAD/km — admin-editable |
| Round-trip modifier | ×1.80 on post-modifier subtotal |
| TVA rate | 10% default — admin-configurable |
| SUTURE default | 350 MAD — admin override supported |
| Manual override | Admin only · Mandatory reason · Both totals stored |
| Rule conflict | Most specific matching rule wins |
| Zero-price fallback | Forbidden |
| Pricing at service creation | Price frozen at booking time, not invoice time |

## Manual Override Workflow

```
1. Service created → engine computes → snapshot v1 (isCurrent=true)
2. Admin reviews service detail page
3. Admin clicks "Modifier le tarif" → OverrideForm modal
4. On submit → applyOverrideAction(serviceId, newTotal, reason)
   → Inside $transaction:
     a. Read current snapshot
     b. Set old snapshot isCurrent = false
     c. Create NEW snapshot (version+1, isCurrent=true, isOverridden=true)
5. If invoice line exists → update reference, recalculate invoice totals
```
