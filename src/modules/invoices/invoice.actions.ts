"use server";

import { revalidatePath } from "next/cache";
import { createInvoiceSchema } from "./invoice.schema";
import * as invoiceService from "./invoice.service";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import type { InvoicePdfData, InvoicePdfLine } from "./pdf/invoicePdf.types";

// TODO: Replace with real auth in Phase 09
const TEMP_USER = { id: 1, role: "admin" };

export async function createInvoiceAction(rawInput: unknown) {
  const parsed = createInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  try {
    const invoice = await invoiceService.createInvoice(parsed.data, TEMP_USER.id);
    revalidatePath("/dashboard/invoices");
    return { success: true as const, data: { id: invoice.id, invoiceNumber: invoice.invoiceNumber } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création de la facture.";
    return { success: false as const, error: message };
  }
}

export async function cancelInvoiceAction(id: number) {
  try {
    await invoiceService.cancelInvoice(id);
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);
    return { success: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'annulation de la facture.";
    return { success: false as const, error: message };
  }
}

export async function loadInvoiceFormDataAction() {
  try {
    const clients = await db.client.findMany({
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });
    return { success: true as const, data: { clients } };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement." };
  }
}

export async function loadUninvoicedServicesAction(clientId: number) {
  try {
    const services = await db.service.findMany({
      where: {
        clientId,
        status: { not: "cancelled" },
        invoiceLine: null,
        snapshots: { some: { isCurrent: true } },
      },
      include: {
        catalog: true,
        patient: true,
        snapshots: { where: { isCurrent: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });

    const data = services.map((s) => ({
      id: s.id,
      catalogName: s.catalog.nameFr,
      patientName: s.patient.fullName,
      scheduledAt: s.scheduledAt.toISOString(),
      totalTtc: Number(s.snapshots[0]?.totalTtc ?? 0),
    }));

    return { success: true as const, data };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement des services." };
  }
}

export async function listInvoicesAction(filters?: {
  clientId?: number;
  status?: string;
}) {
  try {
    const invoices = await invoiceService.listInvoices(filters);
    return { success: true as const, data: invoices };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement des factures." };
  }
}

export async function getInvoiceAction(id: number) {
  try {
    const invoice = await invoiceService.getInvoice(id);
    return { success: true as const, data: invoice };
  } catch {
    return { success: false as const, error: "Facture introuvable." };
  }
}

/**
 * Transform a DB invoice into the generic InvoicePdfData model.
 * This is the ONLY place that bridges Prisma types → PDF engine types.
 */
export async function getInvoicePdfDataAction(id: number): Promise<{
  success: boolean;
  data?: InvoicePdfData;
  error?: string;
}> {
  try {
    const invoice = await invoiceService.getInvoice(id);

    const totalPaid = invoice.payments.reduce(
      (sum: number, p: { amount: unknown }) => sum + Number(p.amount),
      0,
    );

    const tvaRate =
      invoice.lines.length > 0 && Number(invoice.lines[0].lineTotalHt) > 0
        ? Number(invoice.lines[0].snapshot.tvaRate)
        : 0.1;

    const lines: InvoicePdfLine[] = invoice.lines.map(
      (line: {
        lineLabel: string;
        lineTotalHt: unknown;
        lineTva: unknown;
        lineTotalTtc: unknown;
        snapshot: { tvaRate: unknown };
      }) => ({
        label: line.lineLabel,
        quantity: 1,
        unitPriceHt: Number(line.lineTotalHt),
        totalHt: Number(line.lineTotalHt),
        tvaRate: Number(line.snapshot.tvaRate),
        totalTtc: Number(line.lineTotalTtc),
      }),
    );

    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: formatDate(invoice.createdAt),
      dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
      status: invoice.status,
      client: {
        name: invoice.client.name,
        phone: invoice.client.phone,
        email: invoice.client.email ?? undefined,
        address: invoice.client.address,
      },
      lines,
      subtotalHt: Number(invoice.totalHt),
      totalTva: Number(invoice.totalTva),
      totalTtc: Number(invoice.totalTtc),
      tvaRate,
      notes: invoice.notes ?? undefined,
      amountPaid: totalPaid > 0 ? totalPaid : undefined,
    };

    revalidatePath(`/dashboard/invoices/${id}`);
    return { success: true, data: pdfData };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur lors du chargement de la facture.";
    return { success: false, error: message };
  }
}
