import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { listClientsAction } from "@/modules/clients/client.actions";
import { PatientForm } from "../_components/PatientForm";

interface Props {
  searchParams: { clientId?: string };
}

export default async function NewPatientPage({ searchParams }: Props) {
  const result = await listClientsAction();
  const clients = result.success ? result.data : [];

  const clientOptions = clients.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const preselectedClientId = searchParams.clientId ? Number(searchParams.clientId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-1" />
            Retour
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Nouveau patient</h1>
      </div>

      <PatientForm
        mode="create"
        clientOptions={clientOptions}
        preselectedClientId={preselectedClientId}
      />
    </div>
  );
}
