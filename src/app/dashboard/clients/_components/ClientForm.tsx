"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { createClientAction, updateClientAction } from "@/modules/clients/client.actions";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/constants";

interface ClientData {
  id?: number;
  name: string;
  type: ClientType;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

interface Props {
  initialData?: ClientData;
  mode: "create" | "edit";
}

const TYPE_OPTIONS = (Object.entries(CLIENT_TYPE_LABELS) as [ClientType, string][]).map(
  ([value, label]) => ({ value, label }),
);

export function ClientForm({ initialData, mode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    const result =
      mode === "edit" && initialData?.id
        ? await updateClientAction(initialData.id, formData)
        : await createClientAction(formData);

    if (result.success) {
      if (mode === "create" && "data" in result) {
        const created = result as { success: true; data: { id: number } };
        router.push(`/dashboard/clients/${created.data.id}`);
      } else {
        router.push(`/dashboard/clients/${initialData?.id}`);
      }
    } else {
      if (typeof result.error === "string") {
        setError(result.error);
      } else if (result.error && "fieldErrors" in result.error) {
        setFieldErrors(result.error.fieldErrors as Record<string, string[]>);
      }
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <h2 className="text-sm font-semibold text-text-primary">
          {mode === "create" ? "Nouveau client" : "Modifier le client"}
        </h2>
      </CardHeader>
      <CardBody>
        {error && (
          <div className="mb-4 text-sm text-status-danger bg-status-danger-soft px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom complet"
            name="name"
            defaultValue={initialData?.name}
            error={fieldErrors.name?.[0]}
            required
          />

          <Select
            label="Type de client"
            name="type"
            options={TYPE_OPTIONS}
            defaultValue={initialData?.type || "individual"}
            error={fieldErrors.type?.[0]}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              name="phone"
              type="tel"
              defaultValue={initialData?.phone}
              error={fieldErrors.phone?.[0]}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              defaultValue={initialData?.email}
              error={fieldErrors.email?.[0]}
            />
          </div>

          <Input
            label="Adresse"
            name="address"
            defaultValue={initialData?.address}
            error={fieldErrors.address?.[0]}
            required
          />

          <Textarea
            label="Notes"
            name="notes"
            rows={3}
            defaultValue={initialData?.notes}
            error={fieldErrors.notes?.[0]}
          />

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={loading}>
              {mode === "create" ? "Créer le client" : "Enregistrer les modifications"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={loading}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
