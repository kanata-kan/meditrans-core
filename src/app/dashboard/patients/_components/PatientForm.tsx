"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { createPatientAction, updatePatientAction } from "@/modules/patients/patient.actions";

interface PatientData {
  id?: number;
  clientId: number;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  medicalNotes: string;
}

interface ClientOption {
  value: string;
  label: string;
}

interface Props {
  initialData?: PatientData;
  mode: "create" | "edit";
  clientOptions: ClientOption[];
  preselectedClientId?: number;
}

export function PatientForm({ initialData, mode, clientOptions, preselectedClientId }: Props) {
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
        ? await updatePatientAction(initialData.id, formData)
        : await createPatientAction(formData);

    if (result.success) {
      if (mode === "create" && "data" in result) {
        const created = result as { success: true; data: { id: number } };
        router.push(`/dashboard/patients/${created.data.id}`);
      } else {
        router.push(`/dashboard/patients/${initialData?.id}`);
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

  const defaultClientId = initialData?.clientId?.toString() || preselectedClientId?.toString() || "";

  return (
    <Card className="max-w-2xl">
      <CardHeader title={mode === "create" ? "Nouveau patient" : "Modifier le patient"} />
      <CardBody>
        {error && (
          <div className="mb-4 text-sm text-status-danger bg-status-danger-soft px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Client rattaché"
            name="clientId"
            options={clientOptions}
            defaultValue={defaultClientId}
            placeholder="Sélectionner un client"
            error={fieldErrors.clientId?.[0]}
            required
          />

          <Input
            label="Nom complet"
            name="fullName"
            defaultValue={initialData?.fullName}
            error={fieldErrors.fullName?.[0]}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date de naissance"
              name="dateOfBirth"
              type="date"
              defaultValue={initialData?.dateOfBirth}
              error={fieldErrors.dateOfBirth?.[0]}
              required
            />
            <Input
              label="Téléphone"
              name="phone"
              type="tel"
              defaultValue={initialData?.phone}
              error={fieldErrors.phone?.[0]}
              required
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
            label="Notes médicales"
            name="medicalNotes"
            rows={3}
            defaultValue={initialData?.medicalNotes}
            error={fieldErrors.medicalNotes?.[0]}
          />

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={loading}>
              {mode === "create" ? "Créer le patient" : "Enregistrer les modifications"}
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
