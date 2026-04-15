import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, UserRound, Ambulance } from "lucide-react";
import { getClientAction } from "@/modules/clients/client.actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { ClientDeleteButton } from "./_components/ClientDeleteButton";

const TYPE_BADGE: Record<ClientType, "default" | "info" | "warning"> = {
  individual: "default",
  company: "info",
  insurer: "warning",
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const result = await getClientAction(id);
  if (!result.success) notFound();

  const client = result.data;

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-1" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{client.name}</h1>
            <Badge variant={TYPE_BADGE[client.type as ClientType]} className="mt-1">
              {CLIENT_TYPE_LABELS[client.type as ClientType]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/clients/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil size={14} className="mr-1" />
              Modifier
            </Button>
          </Link>
          <ClientDeleteButton clientId={id} clientName={client.name} />
        </div>
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary">Informations</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <InfoRow icon={<Phone size={15} />} label="Téléphone" value={client.phone} />
            <InfoRow icon={<Mail size={15} />} label="Email" value={client.email || "—"} />
            <InfoRow icon={<MapPin size={15} />} label="Adresse" value={client.address} />
            <InfoRow icon={<FileText size={15} />} label="Notes" value={client.notes || "—"} />
            <InfoRow icon={<FileText size={15} />} label="Créé le" value={formatDate(client.createdAt)} />
          </CardBody>
        </Card>

        {/* Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary">Résumé</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatBox
                icon={<UserRound size={18} className="text-brand-primary" />}
                label="Patients"
                value={client.patients.length}
              />
              <StatBox
                icon={<Ambulance size={18} className="text-status-info" />}
                label="Services"
                value={client._count.services}
              />
              <StatBox
                icon={<FileText size={18} className="text-status-warning" />}
                label="Factures"
                value={client._count.invoices}
              />
            </div>

            {/* Patients list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary">Patients rattachés</h3>
                <Link href={`/dashboard/patients/new?clientId=${id}`}>
                  <Button variant="ghost" size="sm">+ Ajouter</Button>
                </Link>
              </div>
              {client.patients.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">Aucun patient rattaché</p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {client.patients.map((p: { id: number; fullName: string; phone: string; dateOfBirth: Date }) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/patients/${p.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-surface-light transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{p.fullName}</p>
                        <p className="text-xs text-text-muted">{p.phone}</p>
                      </div>
                      <span className="text-xs text-text-muted">{formatDate(p.dateOfBirth)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* ── Helper components ── */
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

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-surface-light rounded-lg p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
