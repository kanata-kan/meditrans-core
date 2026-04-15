# 13 — Phase 1 Scope vs Future Scope

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 13

## Phase 1 — Must Build

| Feature | Justification |
|---|---|
| Full CRUD: clients, patients, services, invoices, payments | Core operational data |
| Pricing Engine with all five pricing tables + system_config | Business-critical |
| Multi-service invoices via InvoiceLine | Required for real-world billing |
| Admin manual price override with audit trail | Required for SUTURE and exceptions |
| PDF invoice export | Legal requirement |
| Payment recording and invoice status tracking | Core financial tracking |
| Admin configurable: night window, TVA rate, distance rate | No hardcoding |
| Admin / Assistant roles and route protection | Minimum security |
| Dashboard KPIs | Operational visibility |

## Future Scope — Do Not Build Now

| Feature | Phase | Notes |
|---|---|---|
| Appointment scheduling with calendar | Phase 2 | Service remains the core |
| In-app notifications (email, SMS) | Phase 2 | Requires event infrastructure |
| Online payment (Stripe or CMI) | Phase 2 | Requires PSP integration |
| Holiday / weekend pricing activation | Phase 2 | Modifier seeded but inactive |
| VIP tier pricing | Phase 2 | Modifier seeded at ×1.00 |
| Client contract pricing | Phase 2 | Adds `client_pricing_contracts` table |
| Multi-tenant | Phase 3 | Requires tenant isolation |
| Mobile app (PWA or React Native) | Phase 3 | API-first design enables this |
| Public API for third-party integrations | Phase 3 | Expose key endpoints with API key auth |
