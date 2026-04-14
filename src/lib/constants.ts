export type UserRole = "admin" | "assistant";

export type ServiceStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export type UrgencyLevel = "normal" | "urgent";

export type StaffType = "nurse" | "doctor" | "reanimator";

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";

export type PaymentMethod = "cash" | "card" | "transfer" | "cheque";

export type ClientType = "individual" | "company" | "insurer";

export type ModifierType = "flat_add" | "multiplier";

export function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "assistant";
}

export function isServiceStatus(value: unknown): value is ServiceStatus {
  return (
    value === "pending" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "cancelled"
  );
}

export function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return (
    value === "unpaid" ||
    value === "partial" ||
    value === "paid" ||
    value === "cancelled"
  );
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    value === "cash" ||
    value === "card" ||
    value === "transfer" ||
    value === "cheque"
  );
}

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Complété",
  cancelled: "Annulé",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: "Impayé",
  partial: "Partiel",
  paid: "Payé",
  cancelled: "Annulé",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  card: "Carte bancaire",
  transfer: "Virement",
  cheque: "Chèque",
};

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: "Particulier",
  company: "Entreprise",
  insurer: "Assureur",
};

export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  nurse: "Infirmier",
  doctor: "Médecin",
  reanimator: "Réanimateur",
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  normal: "Normal",
  urgent: "Urgent",
};
