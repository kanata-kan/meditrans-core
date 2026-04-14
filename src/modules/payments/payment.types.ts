import type { PaymentMethod } from "@/lib/constants";

export interface CreatePaymentInput {
  invoiceId: number;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  reference?: string;
  notes?: string;
}
