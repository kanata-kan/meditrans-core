# 05 — Domain Model and Entities

> **Source:** MediTrans Architecture Blueprint v5.0 · Section 5

## 5.1 User

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `email` | `string` | Unique |
| `password_hash` | `string` | Never stored plain |
| `role` | `enum` | `admin` \| `assistant` |
| `name` | `string` | Display name |
| `is_active` | `boolean` | Soft disable |
| `created_at` | `timestamp` | — |

## 5.2 Client

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `name` | `string` | Person or company name |
| `type` | `enum` | `individual` \| `company` \| `insurer` |
| `phone` | `string` | — |
| `email` | `string` | Optional |
| `address` | `string` | — |
| `notes` | `text` | Internal notes |
| `created_at` | `timestamp` | — |

## 5.3 Patient

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `client_id` | `int FK` | Responsible client |
| `full_name` | `string` | — |
| `date_of_birth` | `date` | — |
| `phone` | `string` | — |
| `address` | `string` | Default pickup address |
| `medical_notes` | `text` | Operator notes — not a medical record |
| `created_at` | `timestamp` | — |

## 5.4 Service (The Operational Core)

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `patient_id` | `int FK` | Who is transported |
| `client_id` | `int FK` | Who will be invoiced |
| `catalog_code` | `string FK` | References `service_catalog.code` |
| `status` | `enum` | `pending` \| `in_progress` \| `completed` \| `cancelled` |
| `urgency` | `enum` | `normal` \| `urgent` |
| `from_location` | `string` | Pickup address |
| `to_location` | `string` | Drop-off address |
| `distance_km` | `decimal` | For distance fee calculation |
| `is_round_trip` | `boolean` | Triggers ×1.80 modifier |
| `staff_type` | `enum?` | `nurse` \| `doctor` \| `reanimator` \| `null` |
| `duration_hours` | `int?` | 12 or 24 — for disposition services |
| `scheduled_at` | `timestamp` | Determines night/day context for pricing |
| `completed_at` | `timestamp?` | Set when status → `completed` |
| `notes` | `text?` | Operator notes |
| `created_by` | `int FK` | Creating user |
| `created_at` | `timestamp` | — |

## 5.5 PricingSnapshot

Immutable record of one price computation. Versioned per service.

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `service_id` | `int FK` | Service this snapshot belongs to |
| `version` | `int` | 1 for initial; increments per override |
| `is_current` | `boolean` | `true` on active snapshot |
| `calculated_at` | `timestamp` | — |
| `input_params` | `jsonb` | Full PricingInput frozen at compute time |
| `base_price` | `decimal` | From matched pricing_rule |
| `distance_fee` | `decimal` | distanceKm × rate |
| `modifiers_applied` | `jsonb` | Array of applied modifiers with impact |
| `subtotal_ht` | `decimal` | Pre-TVA total |
| `tva_rate` | `decimal` | 0.10 by default |
| `tva_amount` | `decimal` | subtotalHt × tvaRate |
| `total_ttc` | `decimal` | Final amount |
| `matched_rule_ids` | `int[]` | Which pricing_rules rows were matched |
| `is_overridden` | `boolean` | True if admin manually set the price |
| `override_reason` | `text?` | Mandatory when is_overridden = true |
| `override_by` | `int FK?` | Admin user who applied the override |
| `override_original_total` | `decimal?` | The computed total before override |
| `currency` | `string` | `MAD` |

**Unique constraint:** `(service_id, version)` — compound uniqueness.

## 5.6 Invoice

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `client_id` | `int FK` | All lines must belong to this client |
| `invoice_number` | `string UNIQUE` | `INV-YYYY-NNNN` |
| `status` | `enum` | `unpaid` \| `partial` \| `paid` \| `cancelled` |
| `total_ht` | `decimal` | Σ of all line subtotals HT |
| `total_tva` | `decimal` | Σ of all line TVA amounts |
| `total_ttc` | `decimal` | Σ of all line totals TTC |
| `due_date` | `date?` | Payment deadline |
| `notes` | `text?` | — |
| `created_by` | `int FK` | — |
| `created_at` | `timestamp` | — |

## 5.7 InvoiceLine

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `invoice_id` | `int FK` | Parent invoice |
| `service_id` | `int FK` | The service being billed (unique) |
| `snapshot_id` | `int FK` | Immutable pricing snapshot |
| `line_label` | `string` | Human-readable label from catalog (French) |
| `line_total_ht` | `decimal` | snapshot.subtotal_ht |
| `line_tva` | `decimal` | snapshot.tva_amount |
| `line_total_ttc` | `decimal` | snapshot.total_ttc |
| `sort_order` | `int` | Display order on invoice PDF |

## 5.8 Payment

| Field | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `invoice_id` | `int FK` | — |
| `amount` | `decimal` | Amount of this individual payment |
| `method` | `enum` | `cash` \| `card` \| `transfer` \| `cheque` |
| `paid_at` | `timestamp` | When received |
| `reference` | `string?` | Bank ref, receipt number |
| `notes` | `text?` | — |
| `created_by` | `int FK` | — |
| `created_at` | `timestamp` | — |
