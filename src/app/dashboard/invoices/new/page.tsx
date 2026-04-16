import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { loadInvoiceFormDataAction } from "@/modules/invoices/invoice.actions";
import { InvoiceForm } from "../_components/InvoiceForm";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const result = await loadInvoiceFormDataAction();

  if (!result.success) {
    return (
      <div className="text-center py-12 text-status-danger">
        Erreur lors du chargement des données du formulaire.
      </div>
    );
  }

  const { clients } = result.data;
  const preselectedClientId = searchParams.clientId
    ? Number(searchParams.clientId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-1" />
            Retour
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Nouvelle facture</h1>
      </div>

      <InvoiceForm clients={clients} preselectedClientId={preselectedClientId} />
    </div>
  );
}
