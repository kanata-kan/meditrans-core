# 03 — Business Domain Overview

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 3

## Core Entity Distinctions

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

## Business Module Map

| Module | Role | Core Entity |
|---|---|---|
| `users` | Authentication and role management (Admin / Assistant) | `User` |
| `clients` | Paying entities — individuals, companies, insurers | `Client` |
| `patients` | Persons transported — distinct from the payer | `Patient` |
| `services` | **The operational core.** Every transport or medical act. | `Service` |
| `pricing` | Rule-based price computation engine | `PricingSnapshot` |
| `invoices` | Legal billing documents grouping services per client | `Invoice` |
| `payments` | Real financial transactions linked to invoices | `Payment` |
