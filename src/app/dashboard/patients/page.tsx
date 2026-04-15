import { listPatientsAction } from "@/modules/patients/patient.actions";
import { PatientsPageClient } from "./_components/PatientsPageClient";

export default async function PatientsPage() {
  const result = await listPatientsAction();
  const patients = result.success ? result.data : [];

  return <PatientsPageClient initialPatients={patients} />;
}
