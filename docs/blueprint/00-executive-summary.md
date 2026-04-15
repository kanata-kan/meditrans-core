# 01 — Executive Summary

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 1

This document is the single source of truth for the Medical Transport System — a production-grade operational platform for managing ambulance transport and home medical services in Morocco.

The system manages the full lifecycle of a medical transport company: from client and patient registration, through service scheduling and automated pricing, to invoice generation and payment tracking.

This v5.0 revision builds on v4.0 by resolving one critical architectural conflict (pricing snapshot uniqueness vs. append-only versioning — see CR-11) and locking all previously open business questions (invoice cancellation behavior — see CR-12). All architecture and design decisions are now final.

## Central Design Decision

`Service` is the operational core. Every other entity — clients, patients, pricing, invoices, payments — exists downstream from a `Service` record. The Pricing Engine is a domain service called synchronously at service creation. Invoices are financial documents that aggregate one or more services for a client, each with its own immutable pricing snapshot.

## Locked Decisions Summary

| Decision | Value | Configurable |
|---|---|---|
| Night surcharge (NIGHT_SURCHARGE) | +100 MAD flat (optional, manually selected) | Yes — `pricing_modifiers` table |
| Distance rate | 7.50 MAD/km | Yes — `pricing_distance_rates` table |
| TVA rate | 10% | Yes — `system_config` table, per category |
| SUTURE default price | 350 MAD (midpoint), admin override enabled | Yes — manual override |
| Invoice model | One invoice, multiple services (same client) | — |
| Manual price override | Admin only, mandatory reason, audit-logged | — |
| Snapshot versioning | Versioned `(service_id, version)`; `is_current` flag; append-only | No |
| Invoice cancellation with payments | Blocked — cancellation rejected if any payment exists | No |

## Stack

| Tech | Role |
|---|---|
| Next.js 14 | Full-stack framework (App Router + Server Actions) |
| TypeScript | Strict mode — no `any` |
| PostgreSQL | Primary database |
| Prisma 5 | ORM + migrations |
| TailwindCSS | Utility-first styling with design tokens |
| Zod | Schema validation |
| NextAuth.js | Authentication (Phase 9) |
