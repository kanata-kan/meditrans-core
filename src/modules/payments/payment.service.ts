import { db } from "@/lib/db";
import * as paymentRepo from "./payment.repository";
import type { CreatePaymentInput } from "./payment.types";

export async function recordPayment(
  input: CreatePaymentInput,
  createdById: number,
) {
  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
  });

  if (!invoice) throw new Error("Facture introuvable.");
  if (invoice.status === "cancelled") {
    throw new Error("Impossible d'enregistrer un paiement sur une facture annulée.");
  }
  if (invoice.status === "paid") {
    throw new Error("Cette facture est déjà entièrement payée.");
  }

  const payment = await paymentRepo.createPayment({
    invoiceId: input.invoiceId,
    amount: input.amount,
    method: input.method,
    paidAt: new Date(input.paidAt),
    reference: input.reference,
    notes: input.notes,
    createdById,
  });

  const totalPaid = await paymentRepo.sumPaymentsByInvoice(input.invoiceId);
  const totalTtc = Number(invoice.totalTtc);

  let newStatus: "unpaid" | "partial" | "paid";
  if (totalPaid >= totalTtc) {
    newStatus = "paid";
  } else if (totalPaid > 0) {
    newStatus = "partial";
  } else {
    newStatus = "unpaid";
  }

  await db.invoice.update({
    where: { id: input.invoiceId },
    data: { status: newStatus },
  });

  return payment;
}

export async function listPaymentsByInvoice(invoiceId: number) {
  return paymentRepo.findPaymentsByInvoice(invoiceId);
}
