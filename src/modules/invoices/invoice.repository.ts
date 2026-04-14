import { db } from "@/lib/db";
import type { InvoiceStatus } from "@/lib/constants";

export async function findAllInvoices(filters?: { clientId?: number; status?: string }) {
  return db.invoice.findMany({
    where: {
      clientId: filters?.clientId,
      status: (filters?.status as InvoiceStatus) ?? undefined,
    },
    include: {
      client: true,
      lines: { include: { service: { include: { catalog: true } }, snapshot: true } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findInvoiceById(id: number) {
  return db.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      lines: {
        include: {
          service: { include: { catalog: true, patient: true } },
          snapshot: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      payments: { orderBy: { paidAt: "desc" } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function findInvoiceByNumber(invoiceNumber: string) {
  return db.invoice.findUnique({ where: { invoiceNumber } });
}
