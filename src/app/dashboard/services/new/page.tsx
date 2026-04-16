import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { loadFormDataAction } from "@/modules/services/service.actions";
import { ServiceForm } from "../_components/ServiceForm";

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const result = await loadFormDataAction();

  if (!result.success) {
    return (
      <div className="text-center py-12 text-status-danger">
        Erreur lors du chargement des données du formulaire.
      </div>
    );
  }

  const { clients, catalogs, modifiers, nightConfig } = result.data;
  const preselectedClientId = searchParams.clientId ? Number(searchParams.clientId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/services">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-1" />
            Retour
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Nouveau service</h1>
      </div>

      <ServiceForm
        clients={clients}
        catalogs={catalogs}
        modifiers={modifiers}
        nightConfig={nightConfig}
        preselectedClientId={preselectedClientId}
      />
    </div>
  );
}
