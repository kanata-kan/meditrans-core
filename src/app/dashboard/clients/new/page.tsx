import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ClientForm } from "../_components/ClientForm";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-1" />
            Retour
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Nouveau client</h1>
      </div>

      <ClientForm mode="create" />
    </div>
  );
}
