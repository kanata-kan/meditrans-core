# MediTrans Architecture Blueprint v5.0

> **Modular Documentation** — Each section is a standalone file.
> Original source: `MediTrans-Architecture-Blueprint.md` (1388 lines → 14 focused files)

## Table of Contents

| # | File | Section |
|---|---|---|
| 00 | [Executive Summary](./00-executive-summary.md) | Stack, locked decisions, central design decision |
| 01 | [Product Vision](./01-product-vision.md) | System goals, language convention |
| 02 | [Business Domain](./02-business-domain.md) | Core entity distinctions, module map |
| 03 | [System Flow](./03-system-flow.md) | Canonical flow diagram (setup → service → pricing → invoice → payment) |
| 04 | [Domain Entities](./04-domain-entities.md) | All 8 entity definitions with field tables |
| 05 | [Pricing Engine](./05-pricing-engine.md) | Engine architecture, algorithm, rules, override, preview |
| 06 | [Database Schema](./06-database-schema.md) | Schema overview, key decisions, enums, seed data |
| 07 | [Architecture](./07-architecture.md) | Folder structure, layer responsibilities, Server Actions vs REST |
| 08 | [Design System](./08-design-system.md) | Tokens, typography, status pills, absolute rules |
| 09 | [Business Rules](./09-business-rules.md) | Service lifecycle, invoice lifecycle, pricing rules, override workflow |
| 10 | [Conflict Resolution](./10-conflict-resolution.md) | All 12 CRs — resolved |
| 11 | [Roadmap](./11-roadmap.md) | Stages 01–09 with details (3 completed) |
| 12 | [Scope](./12-scope.md) | Phase 1 must-build vs future scope |
| 13 | [Pre-Go-Live](./13-pre-go-live.md) | TVA exemptions, re-total, cancellation, concurrency |
| 14 | [Design Principles](./14-design-principles.md) | 14 non-negotiable principles |

## Quick Reference

- **Current Progress:** Stage 03 / 09 (33%)
- **Completed:** Foundations → Design System → Clients & Patients
- **Next:** Stage 04 — Pricing Engine (unit tests critical)
- **Architecture Pattern:** Server Actions (no REST APIs in Phase 1)
- **Stack:** Next.js 14 · TypeScript · PostgreSQL · Prisma · TailwindCSS · Zod
