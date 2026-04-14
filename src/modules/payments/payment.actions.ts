"use server";

import { z } from "zod";
import * as paymentService from "./payment.service";

const createPaymentSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  method: z.enum(["cash", "card", "transfer", "cheque"]),
  paidAt: z.string().datetime(),
  reference: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export async function recordPaymentAction(
  rawInput: unknown,
  createdById: number,
) {
  const parsed = createPaymentSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    const payment = await paymentService.recordPayment(parsed.data, createdById);
    return { success: true, data: { id: payment.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement du paiement.";
    return { success: false, error: message };
  }
}
