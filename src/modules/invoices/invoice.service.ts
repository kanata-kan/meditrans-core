import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import * as invoiceRepo from "./invoice.repository";
import type { CreateInvoiceInput } from "./invoice.types";
import { generateInvoiceNumber } from "./invoice.utils";

export async function createInvoice(
  input: CreateInvoiceInput,
  createdById: number,
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const services = await tx.service.findMany({
      where: { id: { in: input.serviceIds } },
      include: {
        snapshots: { where: { isCurrent: true } },
        catalog: true,
        invoiceLine: true,
      },
    });

    for (const svc of services) {
      if (svc.clientId !== input.clientId) {
        throw new Error(
          `Le service #${svc.id} n'appartient pas au client sélectionné.`,
        );
      }
      if (svc.status === "cancelled") {
        throw new Error(`Le service #${svc.id} est annulé et ne peut pas être facturé.`);
      }
      if (svc.invoiceLine) {
        throw new Error(`Le service #${svc.id} a déjà été ajouté à une autre facture.`);
      }
      if (svc.snapshots.length === 0) {
        throw new Error(`Le service #${svc.id} n'a pas de tarif calculé.`);
      }
    }

    let totalHt = 0;
    let totalTva = 0;
    let totalTtc = 0;

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await tx.invoice.create({
      data: {
        clientId: input.clientId,
        invoiceNumber,
        status: "unpaid",
        totalHt: 0,
        totalTva: 0,
        totalTtc: 0,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        notes: input.notes ?? null,
        createdById,
      },
    });

    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      const snap = svc.snapshots[0];

      const lineHt = Number(snap.subtotalHt);
      const lineTva = Number(snap.tvaAmount);
      const lineTtc = Number(snap.totalTtc);

      totalHt += lineHt;
      totalTva += lineTva;
      totalTtc += lineTtc;

      await tx.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          serviceId: svc.id,
          snapshotId: snap.id,
          lineLabel: svc.catalog.nameFr,
          lineTotalHt: lineHt,
          lineTva: lineTva,
          lineTotalTtc: lineTtc,
          sortOrder: i,
        },
      });
    }

    return tx.invoice.update({
      where: { id: invoice.id },
      data: { totalHt, totalTva, totalTtc },
    });
  });
}

export async function listInvoices(filters?: {
  clientId?: number;
  status?: string;
}) {
  return invoiceRepo.findAllInvoices(filters);
}

export async function getInvoice(id: number) {
  const invoice = await invoiceRepo.findInvoiceById(id);
  if (!invoice) throw new Error("Facture introuvable.");
  return invoice;
}

export async function cancelInvoice(id: number) {
  const invoice = await invoiceRepo.findInvoiceById(id);
  if (!invoice) throw new Error("Facture introuvable.");

  const totalPaid = invoice.payments.reduce(
    (sum: number, p: { amount: unknown }) => sum + Number(p.amount),
    0,
  );

  if (totalPaid > 0) {
    throw new Error(
      "Cette facture ne peut pas être annulée car des paiements ont déjà été enregistrés.",
    );
  }

  return db.invoice.update({
    where: { id },
    data: { status: "cancelled" },
  });
}
