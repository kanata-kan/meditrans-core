import type { InvoicePdfConfig } from "./invoicePdf.types";

/* ── MediTrans default configuration ─────────────────────────────────────── */

export const DEFAULT_INVOICE_CONFIG: InvoicePdfConfig = {
  companyName: "MediTrans",
  companyAddress: "Casablanca, Maroc",
  companyPhone: "+212 5 22 00 00 00",
  companyEmail: "contact@meditrans.ma",
  companyTaxId: "ICE: 00000000000000",

  primaryColor: "#1a73e8",
  secondaryColor: "#4a5568",

  showLogo: false,
  showFooter: true,

  currency: "MAD",
  locale: "fr-MA",

  labels: {
    invoiceTitle: "FACTURE",
    invoiceNumber: "N° Facture",
    issueDate: "Date d'émission",
    dueDate: "Date d'échéance",
    client: "Client",
    patient: "Patient",
    description: "Description",
    quantity: "Qté",
    unitPriceHt: "P.U. HT",
    totalHt: "Total HT",
    tva: "TVA",
    totalTtc: "Total TTC",
    subtotal: "Sous-total HT",
    notes: "Notes",
    page: "Page",
  },

  footerText:
    "Merci pour votre confiance. Paiement à réception de la facture sauf accord préalable.",
};

/* ── Merge helper — deep merge user config over defaults ─────────────────── */

export function mergeConfig(
  overrides?: Partial<InvoicePdfConfig>,
): InvoicePdfConfig {
  if (!overrides) return DEFAULT_INVOICE_CONFIG;

  return {
    ...DEFAULT_INVOICE_CONFIG,
    ...overrides,
    labels: {
      ...DEFAULT_INVOICE_CONFIG.labels,
      ...overrides.labels,
    },
  };
}
