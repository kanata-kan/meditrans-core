"use server";

import { createInvoiceSchema } from "./invoice.schema";
import * as invoiceService from "./invoice.service";

export async function createInvoiceAction(rawInput: unknown, createdById: number) {
  const parsed = createInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    const invoice = await invoiceService.createInvoice(parsed.data, createdById);
    return { success: true, data: { id: invoice.id, invoiceNumber: invoice.invoiceNumber } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de la facture.";
    return { success: false, error: message };
  }
}

export async function cancelInvoiceAction(id: number) {
  try {
    await invoiceService.cancelInvoice(id);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'annulation de la facture.";
    return { success: false, error: message };
  }
}

export async function listInvoicesAction(filters?: {
  clientId?: number;
  status?: string;
}) {
  try {
    const invoices = await invoiceService.listInvoices(filters);
    return { success: true, data: invoices };
  } catch {
    return { success: false, error: "Erreur lors du chargement des factures." };
  }
}
