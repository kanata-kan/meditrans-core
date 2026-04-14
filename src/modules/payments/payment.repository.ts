import { db } from "@/lib/db";

export async function findPaymentsByInvoice(invoiceId: number) {
  return db.payment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: "desc" },
  });
}

export async function createPayment(data: {
  invoiceId: number;
  amount: number;
  method: "cash" | "card" | "transfer" | "cheque";
  paidAt: Date;
  reference?: string;
  notes?: string;
  createdById: number;
}) {
  return db.payment.create({ data });
}

export async function sumPaymentsByInvoice(invoiceId: number): Promise<number> {
  const result = await db.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}
