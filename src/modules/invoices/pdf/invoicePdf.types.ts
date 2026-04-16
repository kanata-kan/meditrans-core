/* ═══════════════════════════════════════════════════════════════════════════
 * Invoice PDF Engine — Type Definitions
 *
 * Generic, project-agnostic types.
 * NO Prisma, NO framework-specific imports.
 * ═══════════════════════════════════════════════════════════════════════════ */

// ── Configuration ──────────────────────────────────────────────────────────

export interface InvoicePdfConfig {
  /** Company / Organisation name */
  companyName: string;
  /** Optional logo path or base64 (reserved for v2) */
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  /** Tax / Registration ID (ICE, SIRET, etc.) */
  companyTaxId?: string;

  /** Primary brand colour (hex) */
  primaryColor: string;
  /** Secondary colour for accents */
  secondaryColor: string;

  showLogo: boolean;
  showFooter: boolean;

  /** ISO 4217 currency code */
  currency: "MAD" | "EUR" | "USD";
  /** Locale for number formatting */
  locale: string;

  /** UI labels — fully overridable */
  labels: InvoicePdfLabels;

  /** Footer legal / free-text */
  footerText?: string;
}

export interface InvoicePdfLabels {
  invoiceTitle: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  client: string;
  patient: string;
  description: string;
  quantity: string;
  unitPriceHt: string;
  totalHt: string;
  tva: string;
  totalTtc: string;
  subtotal: string;
  notes: string;
  page: string;
}

// ── Data Input ─────────────────────────────────────────────────────────────

export interface InvoicePdfLine {
  label: string;
  quantity: number;
  unitPriceHt: number;
  totalHt: number;
  tvaRate: number;
  totalTtc: number;
}

export interface InvoicePdfClient {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  status?: string;

  client: InvoicePdfClient;
  patientName?: string;

  lines: InvoicePdfLine[];

  subtotalHt: number;
  totalTva: number;
  totalTtc: number;
  tvaRate: number;

  notes?: string;
  /** Amount already paid (for partial invoices) */
  amountPaid?: number;
}
