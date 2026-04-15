# 15 — Final Design Principles

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 15

| # | Principle | Implication |
|---|---|---|
| 01 | **Service is the operational core** | Every module exists in relation to a Service |
| 02 | **Prices live in the database, never in code** | Any hardcoded price is a bug |
| 03 | **Snapshots are immutable and versioned** | Never modify financial data. Recalculation creates a new version. |
| 04 | **Separation of concerns at every layer** | Repository → Service → Action → Page |
| 05 | **Client ≠ Patient · Invoice ≠ Payment** | Distinct real-world concepts modeled precisely |
| 06 | **Invoices group services** | Invoice is a client-level document. Services belong via lines. |
| 07 | **Manual overrides are first-class** | Designed, audited, and logged |
| 08 | **Pages are thin** | 30-line limit. Assemble components + call actions. |
| 09 | **Tokens first** | No raw colors, spacing, or font values |
| 10 | **UI in French, code in English** | Without exception |
| 11 | **Zero-price fallback is forbidden** | Engine throws a named error |
| 12 | **Error handling is explicit** | Every action returns `{ success, data?, error? }` |
| 13 | **Phase 1 restraint** | Do not build Phase 2 features |
| 14 | **Configurability without complexity** | Rates in DB tables. Admin edits rows, not code. |
