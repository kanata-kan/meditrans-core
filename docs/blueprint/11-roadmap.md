# 12 — Implementation Roadmap

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 12

## Stage 01 — Foundations ✅

- Next.js 14 + TypeScript strict + ESLint + Prettier + path aliases
- Tailwind with full token system
- Prisma schema + first migration
- Seed: `system_config`, `service_catalog`, `pricing_rules`, `pricing_distance_rates`, `pricing_modifiers`

## Stage 02 — Design System ✅

- Atomic components: Button, Input, Select, Table, Badge, Card, Modal, Textarea
- Layout: Sidebar, Header, DashboardLayout
- `lib/constants.ts`, `lib/utils.ts`

## Stage 03 — Clients & Patients ✅

- Full CRUD for clients and patients (repository + service + actions)
- Client: search + type filter + _count includes + delete
- Patient: search + client select + _count includes + delete
- Client list page: interactive table + search + filter tabs + pagination
- Client detail page: info card + stats + patients list + edit/delete
- Client create/edit form with Zod validation
- Patient list page: interactive table + search + pagination
- Patient detail page: info card + client link + stats + edit/delete
- Patient create/edit form with client dropdown + `?clientId` support
- Dashboard: 5 stat cards from DB + quick actions
- All built with Design System components only

## Stage 04 — Pricing Engine Tests ✅

- `pricing.types.ts`, `pricing.errors.ts`, `pricing.schema.ts`
- `pricing.repository.ts`: rules, modifiers, distance rates, snapshots, config loading
- `pricing.utils.ts`: `isNightTime`, `computeSpecificity`, `getTvaRate`, `buildBreakdown`
- `pricing.engine.ts`: full 9-step algorithm
- `pricing.actions.ts`: `previewPriceAction` + `applyOverrideAction`
- **146 tests across 9 files — ALL GREEN:**
  - `tests/pricing/engine.test.ts` — 36 tests (core pricing, distance, modifiers, TVA, TVA exempt, staffType, errors, overrides, persistence)
  - `tests/pricing/snapshot.test.ts` — 6 tests (versioning, isCurrent invariant, override chain)
  - `tests/pricing/utils.test.ts` — 26 tests (isNightTime boundaries, getTvaRate, computeSpecificity, buildBreakdown)
  - `tests/invoices/invoice.test.ts` — 5 tests (CR-07, CR-08, CR-09, CR-12)
  - `tests/payments/payment.test.ts` — 9 tests (partial, full, overpayment, CR-12)
  - `tests/hardening/integration.test.ts` — 12 tests (createService, createInvoice, cancelInvoice, recordPayment)
  - `tests/hardening/concurrency.test.ts` — 4 tests (parallel persist, override race)
  - `tests/hardening/security.test.ts` — 21 tests (SQL injection, XSS, Zod, type guards)
  - `tests/hardening/stress.test.ts` — 27 tests (distance/override/catalog/modifier/schema edge cases)

## Stage 05 — Services Module

- Service creation form with embedded PricingPreview panel
- Admin-only OverrideForm modal on service detail page
- `service.service.ts::createService` calls `pricingEngine.calculate()`
- Full CRUD with status management
- "Uninvoiced services" view, filterable by client

## Stage 06 — Invoices Module

- `createInvoice(clientId, serviceIds[])` reads snapshots, creates lines
- InvoiceBuilder.tsx: client selector → service multi-select → preview → confirm
- Invoice number: `INV-YYYY-NNNN`
- InvoicePDF.tsx: multi-line layout with PricingBreakdownTable
- Re-total logic when override applied after invoice creation

## Stage 07 — Payments Module

- Payment recording form: amount, method, date, reference
- `recordPayment` → sums payments → updates `invoice.status`
- Invoice balance view (total TTC − total paid)

## Stage 08 — Admin Pricing Management

- Read-only views of catalog, rules, modifiers, distance rates
- Edit UI for `system_config` (night window, TVA rate)
- Edit UI for `pricing_distance_rates` (rate per km)
- Admin-only, guarded by role middleware

## Stage 09 — Auth and Dashboard

- NextAuth.js with credentials provider
- Role middleware protecting `/admin/*` and all mutations
- Dashboard KPIs: monthly revenue, total services, uninvoiced count, unpaid total
- Basic recharts revenue chart
