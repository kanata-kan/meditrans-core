# 08 — Folder / Module Architecture

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 8

## Project Structure

```
src/
│
├── app/                              # Next.js App Router — thin pages only
│   ├── layout.tsx
│   ├── page.tsx
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx                  # KPI overview
│       ├── services/
│       ├── invoices/
│       ├── payments/
│       ├── clients/
│       ├── patients/
│       └── admin/pricing/
│
├── modules/                          # Business logic — layered
│   ├── users/
│   ├── clients/
│   ├── patients/
│   ├── services/
│   ├── pricing/
│   ├── invoices/
│   └── payments/
│
├── components/
│   ├── ui/                           # Atoms — no domain knowledge
│   ├── layout/                       # Sidebar, Header, PageWrapper
│   └── features/                     # Domain-specific components
│
├── lib/
│   ├── db.ts                         # Prisma client singleton
│   ├── config.ts                     # Loads system_config
│   ├── utils.ts                      # cn, formatCurrency, formatDate
│   └── constants.ts                  # Enums, type guards
│
└── styles/
    └── tokens.css
```

## Layer Responsibilities

| File | Role | May depend on | May NOT |
|---|---|---|---|
| `*.types.ts` | TypeScript interfaces, enums | Nothing | Logic, imports |
| `*.schema.ts` | Zod input validation | `types`, `zod` | DB, business logic |
| `*.repository.ts` | Prisma CRUD only | `lib/db`, `types` | Business logic, HTTP |
| `*.service.ts` | Business logic, orchestration | `repository`, `types`, `utils`, other services | DB directly, UI, HTTP |
| `*.actions.ts` | Next.js Server Actions — UI entry point | `service`, `schema` | Business logic directly |
| `*.utils.ts` | Pure functions | `types` | Side effects, DB |

## Why Server Actions Instead of REST APIs

This project uses **Next.js Server Actions** (`"use server"`) instead of traditional REST API routes:

```
Page (Server Component) → Server Action → Service → Repository → Prisma (DB)
```

Server Actions are effectively API endpoints that Next.js generates automatically. Benefits:

- **No boilerplate:** No route handlers, no `fetch()`, no CORS, no JSON parsing
- **Type-safe:** TypeScript types flow from server to client without manual serialization
- **Collocated:** Action logic lives next to the service it calls
- **Revalidation:** `revalidatePath()` triggers ISR cache refresh after mutations

REST APIs will be needed in Phase 2+ for mobile apps and Phase 3 for public API.

Pages stay under 30 lines. Server actions always return `{ success: boolean; data?: T; error?: string | ZodFlatError }`.
