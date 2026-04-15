import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getPatientAction } from "@/modules/patients/patient.actions";
import { listClientsAction } from "@/modules/clients/client.actions";
import { PatientForm } from "../../_components/PatientForm";

export default async function EditPatientPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const [patientResult, clientsResult] = await Promise.all([
    getPatientAction(id),
    listClientsAction(),
  ]);

  if (!patientResult.success) notFound();

  const patient = patientResult.data;
  const clients = clientsResult.success ? clientsResult.data : [];

  const clientOptions = clients.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const dob = patient.dateOfBirth instanceof Date
    ? patient.dateOfBirth.toISOString().split("T")[0]
    : String(patient.dateOfBirth).split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/patients/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-1" />
            Retour
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Modifier : {patient.fullName}</h1>
      </div>

      <PatientForm
        mode="edit"
        clientOptions={clientOptions}
        initialData={{
          id: patient.id,
          clientId: patient.clientId,
          fullName: patient.fullName,
          dateOfBirth: dob,
          phone: patient.phone,
          address: patient.address,
          medicalNotes: patient.medicalNotes || "",
        }}
      />
    </div>
  );
}
