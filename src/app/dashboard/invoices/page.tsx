import { listInvoicesAction } from "@/modules/invoices/invoice.actions";
import { InvoicesPageClient } from "./_components/InvoicesPageClient";

export default async function InvoicesPage() {
  const result = await listInvoicesAction();
  const raw = result.success ? result.data ?? [] : [];

  const invoices = raw.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status as "unpaid" | "partial" | "paid" | "cancelled",
    clientName: inv.client.name,
    totalTtc: Number(inv.totalTtc),
    linesCount: inv.lines.length,
    dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
    createdAt: inv.createdAt.toISOString(),
  }));

  return <InvoicesPageClient initialInvoices={invoices} />;
}
