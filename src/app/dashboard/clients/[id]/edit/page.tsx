import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getClientAction } from "@/modules/clients/client.actions";
import { ClientForm } from "../../_components/ClientForm";
import type { ClientType } from "@/lib/constants";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const result = await getClientAction(id);
  if (!result.success) notFound();

  const client = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clients/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-1" />
            Retour
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Modifier : {client.name}</h1>
      </div>

      <ClientForm
        mode="edit"
        initialData={{
          id: client.id,
          name: client.name,
          type: client.type as ClientType,
          phone: client.phone,
          email: client.email || "",
          address: client.address,
          notes: client.notes || "",
        }}
      />
    </div>
  );
}
