import type { InvoiceStatus } from "@/lib/constants";

export interface CreateInvoiceInput {
  clientId: number;
  serviceIds: number[];
  dueDate?: string;
  notes?: string;
}

export interface Invoice {
  id: number;
  clientId: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  dueDate: Date | null;
  notes: string | null;
  createdById: number;
  createdAt: Date;
}
