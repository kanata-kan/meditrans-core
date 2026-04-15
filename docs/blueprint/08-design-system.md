# 09 — UI / Design System Conventions

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 9

## Design Token System

All visual values are defined in `tailwind.config.ts` and referenced exclusively via Tailwind class names.

### Color Tokens

| Token | Value | Usage |
|---|---|---|
| `brand.primary` | `#DC2626` | Primary buttons, active links |
| `brand.hover` | `#B91C1C` | Hover state |
| `brand.soft` | `#FEE2E2` | Light backgrounds, callouts |
| `surface.dark` | `#111827` | Sidebar, header |
| `surface.light` | `#F9FAFB` | Page backgrounds |
| `status.success` | `#16A34A` | Paid, completed |
| `status.warning` | `#D97706` | Partial, pending |
| `status.danger` | `#DC2626` | Cancelled, error |
| `status.info` | `#2563EB` | In progress |
| `text.primary` | `#111827` | Headings |
| `text.secondary` | `#4B5563` | Descriptions |
| `text.muted` | `#9CA3AF` | Placeholders |

### Typography Tokens

| Token | Size | Weight | Usage |
|---|---|---|---|
| `text.4xl` | 36px | 700 | Page titles |
| `text.2xl` | 24px | 700 | Card headings |
| `text.base` | 14px | 400 | Body text |
| `text.sm` | 13px | 400 | Descriptions |
| `text.xs` | 12px | 500 | Badges, captions |

Font: `Inter, system-ui` · Mono: `JetBrains Mono`

## Status Pill Convention

```
pending     → yellow  → "En attente"
in_progress → blue    → "En cours"
completed   → green   → "Complété"
cancelled   → red     → "Annulé"
unpaid      → red     → "Impayé"
partial     → orange  → "Partiel"
paid        → green   → "Payé"
```

## Absolute Rules

| Rule | Reason |
|---|---|
| No raw CSS values or inline styles | Tokens only |
| No business logic in components | Components receive typed props and render |
| No logic in pages or API routes | Pages call server actions; actions call services |
| No `any` TypeScript | Type explicitly or use `unknown` |
| Components under 150 lines | Longer = extract |
| Override form visible to `admin` role only | Enforce via role guard |
