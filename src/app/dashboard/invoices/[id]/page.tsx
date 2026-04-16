import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, CreditCard } from "lucide-react";
import { getInvoiceAction } from "@/modules/invoices/invoice.actions";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { InvoiceActions } from "./_components/InvoiceActions";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const result = await getInvoiceAction(id);
  if (!result.success || !result.data) notFound();

  const inv = result.data;
  const totalPaid = inv.payments.reduce(
    (sum: number, p: { amount: unknown }) => sum + Number(p.amount),
    0,
  );
  const remaining = Number(inv.totalTtc) - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-1" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary font-mono">
              {inv.invoiceNumber}
            </h1>
            <Badge variant={statusToBadgeVariant(inv.status, "invoice")} className="mt-1">
              {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              <Download size={14} className="mr-1" />
              Télécharger PDF
            </Button>
          </a>
          <InvoiceActions invoiceId={id} status={inv.status} totalPaid={totalPaid} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Invoice info ── */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary">Informations</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <InfoRow
              icon={<FileText size={15} />}
              label="Client"
              value={inv.client.name}
              href={`/dashboard/clients/${inv.client.id}`}
            />
            <InfoRow icon={<FileText size={15} />} label="Créée le" value={formatDateTime(inv.createdAt)} />
            {inv.dueDate && (
              <InfoRow icon={<FileText size={15} />} label="Échéance" value={formatDate(inv.dueDate)} />
            )}
            <InfoRow icon={<CreditCard size={15} />} label="Total HT" value={formatCurrency(Number(inv.totalHt))} />
            <InfoRow icon={<CreditCard size={15} />} label="TVA" value={formatCurrency(Number(inv.totalTva))} />
            <InfoRow icon={<CreditCard size={15} />} label="Total TTC" value={formatCurrency(Number(inv.totalTtc))} />

            <div className="border-t border-border pt-3 space-y-2">
              <InfoRow icon={<CreditCard size={15} />} label="Payé" value={formatCurrency(totalPaid)} />
              <div className="flex items-start gap-3">
                <span className="text-text-muted mt-0.5"><CreditCard size={15} /></span>
                <div>
                  <p className="text-xs text-text-muted">Reste à payer</p>
                  <p className={`text-sm font-bold ${remaining > 0 ? "text-status-danger" : "text-status-success"}`}>
                    {formatCurrency(remaining)}
                  </p>
                </div>
              </div>
            </div>

            {inv.notes && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-text-muted mb-1">Notes</p>
                <p className="text-sm text-text-secondary">{inv.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Right: Lines + Payments ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lines */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-text-primary">
                Lignes ({inv.lines.length})
              </h2>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted">#</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted">Description</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-text-muted">HT</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-text-muted">TVA</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-text-muted">TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.lines.map((line: {
                      id: number;
                      lineLabel: string;
                      lineTotalHt: unknown;
                      lineTva: unknown;
                      lineTotalTtc: unknown;
                      service: { id: number; catalog: { nameFr: string } };
                    }, i: number) => (
                      <tr key={line.id} className={i % 2 === 0 ? "bg-surface" : "bg-surface-light"}>
                        <td className="py-2 px-2 text-xs text-text-muted">{i + 1}</td>
                        <td className="py-2 px-2">
                          <Link
                            href={`/dashboard/services/${line.service.id}`}
                            className="text-brand-primary hover:underline"
                          >
                            {line.lineLabel}
                          </Link>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">{formatCurrency(Number(line.lineTotalHt))}</td>
                        <td className="py-2 px-2 text-right font-mono text-text-muted">{formatCurrency(Number(line.lineTva))}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">{formatCurrency(Number(line.lineTotalTtc))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-brand-primary">
                      <td colSpan={2} className="py-2 px-2 font-semibold text-text-primary">Total</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">{formatCurrency(Number(inv.totalHt))}</td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted">{formatCurrency(Number(inv.totalTva))}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-brand-primary">{formatCurrency(Number(inv.totalTtc))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">
                  Paiements ({inv.payments.length})
                </h2>
              </div>
            </CardHeader>
            <CardBody>
              {inv.payments.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">
                  Aucun paiement enregistré
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {inv.payments.map((p: {
                    id: number;
                    amount: unknown;
                    method: string;
                    paidAt: Date | string;
                    reference: string | null;
                  }) => (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {formatCurrency(Number(p.amount))}
                        </p>
                        <p className="text-xs text-text-muted">
                          {p.method} {p.reference ? `— ${p.reference}` : ""}
                        </p>
                      </div>
                      <span className="text-xs text-text-muted">
                        {formatDateTime(p.paidAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Helper ── */
function InfoRow({ icon, label, value, href }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-text-muted mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        {href ? (
          <Link href={href} className="text-sm text-brand-primary hover:underline">
            {value}
          </Link>
        ) : (
          <p className="text-sm text-text-primary">{value}</p>
        )}
      </div>
    </div>
  );
}
