# 02 — Product Vision

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 2

This is not a billing application. It is a complete operational platform for a regulated medical transport business.

## The System Must

- Give operators (admin / assistant roles) a unified interface to manage all operational entities.
- Price every service automatically and auditably using a rule-based engine backed by the database — never hardcoded values.
- Allow administrators to override computed prices in exceptional cases, with mandatory justification and full audit logging.
- Produce legal invoice documents consolidating one or more services for a client, with a complete line-by-line pricing breakdown.
- Track payments separately from invoices, supporting partial payment across cash, card, bank transfer, and cheque.
- Be maintainable by a small engineering team and extensible as the business grows.

## Language Convention

| Context | Language |
|---|---|
| UI labels, buttons, messages, titles | French exclusively |
| Code — variables, functions, types, comments | English only |
