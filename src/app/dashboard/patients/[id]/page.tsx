import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Phone, MapPin, FileText, Calendar, UserRound, Ambulance } from "lucide-react";
import { getPatientAction } from "@/modules/patients/patient.actions";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { PatientDeleteButton } from "./_components/PatientDeleteButton";

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const result = await getPatientAction(id);
  if (!result.success) notFound();

  const patient = result.data;

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/patients">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-1" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{patient.fullName}</h1>
            <p className="text-xs text-text-muted mt-0.5">Patient #{patient.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/patients/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil size={14} className="mr-1" />
              Modifier
            </Button>
          </Link>
          <PatientDeleteButton patientId={id} patientName={patient.fullName} />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient info */}
        <Card className="lg:col-span-1">
          <CardHeader title="Informations patient" />
          <CardBody className="space-y-4">
            <InfoRow icon={<Calendar size={15} />} label="Date de naissance" value={formatDate(patient.dateOfBirth)} />
            <InfoRow icon={<Phone size={15} />} label="Téléphone" value={patient.phone} />
            <InfoRow icon={<MapPin size={15} />} label="Adresse" value={patient.address} />
            <InfoRow icon={<FileText size={15} />} label="Notes médicales" value={patient.medicalNotes || "—"} />
            <InfoRow icon={<FileText size={15} />} label="Créé le" value={formatDate(patient.createdAt)} />
          </CardBody>
        </Card>

        {/* Client + Stats */}
        <Card className="lg:col-span-2">
          <CardHeader title="Client rattaché & statistiques" />
          <CardBody className="space-y-6">
            {/* Client link */}
            <Link
              href={`/dashboard/clients/${patient.client.id}`}
              className="flex items-center gap-4 p-4 bg-surface-light rounded-lg hover:bg-surface-muted transition-colors"
            >
              <UserRound size={20} className="text-brand-primary" />
              <div>
                <p className="text-sm font-semibold text-text-primary">{patient.client.name}</p>
                <Badge variant="default" className="mt-0.5">
                  {CLIENT_TYPE_LABELS[patient.client.type as ClientType]}
                </Badge>
              </div>
            </Link>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-light rounded-lg p-4 text-center">
                <Ambulance size={18} className="mx-auto mb-2 text-status-info" />
                <p className="text-2xl font-bold text-text-primary">{patient._count.services}</p>
                <p className="text-xs text-text-muted">Services</p>
              </div>
              <div className="bg-surface-light rounded-lg p-4 text-center">
                <Phone size={18} className="mx-auto mb-2 text-status-success" />
                <p className="text-sm font-medium text-text-primary">{patient.client.phone}</p>
                <p className="text-xs text-text-muted">Tél. client</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-text-muted mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm text-text-primary">{value}</p>
      </div>
    </div>
  );
}
