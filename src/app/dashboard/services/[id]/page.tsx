import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  User,
  Building2,
  Calendar,
  Ruler,
  Stethoscope,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import {
  SERVICE_STATUS_LABELS,
  URGENCY_LABELS,
  STAFF_TYPE_LABELS,
  type ServiceStatus,
  type StaffType,
} from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getServiceAction } from "@/modules/services/service.actions";
import { ServiceStatusButton } from "../_components/ServiceStatusButton";

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const result = await getServiceAction(id);
  if (!result.success) notFound();

  const service = result.data;
  const snap = service.snapshots?.find((s: { isCurrent: boolean }) => s.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/services">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-1" />
              Retour
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">
                Service #{service.id}
              </h1>
              <Badge variant={statusToBadgeVariant(service.status, "service")}>
                {SERVICE_STATUS_LABELS[service.status as ServiceStatus]}
              </Badge>
              {service.urgency === "urgent" && (
                <Badge variant="danger">{URGENCY_LABELS.urgent}</Badge>
              )}
            </div>
            <p className="text-sm text-text-muted mt-0.5">{service.catalog.nameFr}</p>
          </div>
        </div>
        <ServiceStatusButton
          serviceId={service.id}
          currentStatus={service.status as ServiceStatus}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ══ Left Column — Info ══ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transport */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-text-primary">Détails du transport</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={<MapPin size={15} />} label="Départ" value={service.fromLocation} />
                <InfoRow icon={<MapPin size={15} />} label="Arrivée" value={service.toLocation} />
                <InfoRow icon={<Ruler size={15} />} label="Distance" value={`${Number(service.distanceKm)} km`} />
                <InfoRow icon={<Calendar size={15} />} label="Planifié" value={formatDateTime(service.scheduledAt)} />
                {service.completedAt && (
                  <InfoRow icon={<Calendar size={15} />} label="Terminé" value={formatDateTime(service.completedAt)} />
                )}
                {service.staffType && (
                  <InfoRow
                    icon={<Stethoscope size={15} />}
                    label="Personnel"
                    value={STAFF_TYPE_LABELS[service.staffType as StaffType]}
                  />
                )}
                {service.durationHours && (
                  <InfoRow icon={<Clock size={15} />} label="Durée" value={`${service.durationHours}h`} />
                )}
              </div>
            </CardBody>
          </Card>

          {/* Patient & Client */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-text-primary">Patient & Client</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-surface-light rounded-lg">
                  <User size={18} className="text-brand-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-text-muted">Patient</p>
                    <Link
                      href={`/dashboard/patients/${service.patient.id}`}
                      className="text-sm font-medium text-text-primary hover:text-brand-primary transition-colors"
                    >
                      {service.patient.fullName}
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-surface-light rounded-lg">
                  <Building2 size={18} className="text-brand-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-text-muted">Client</p>
                    <Link
                      href={`/dashboard/clients/${service.client.id}`}
                      className="text-sm font-medium text-text-primary hover:text-brand-primary transition-colors"
                    >
                      {service.client.name}
                    </Link>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Notes */}
          {service.notes && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-text-primary">Notes</h2>
              </CardHeader>
              <CardBody>
                <div className="flex items-start gap-2">
                  <FileText size={15} className="text-text-muted mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{service.notes}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ══ Right Column — Pricing ══ */}
        <div className="lg:col-span-1">
          <Card className="border-brand-primary/20">
            <CardHeader>
              <h2 className="text-sm font-semibold text-text-primary">💰 Tarification</h2>
            </CardHeader>
            <CardBody>
              {snap ? (
                <div className="space-y-3">
                  <DetailRow label="Prix de base" value={formatCurrency(Number(snap.basePrice))} />
                  {Number(snap.distanceFee) > 0 && (
                    <DetailRow label="Frais distance" value={`+${formatCurrency(Number(snap.distanceFee))}`} />
                  )}

                  {/* Modifiers */}
                  {Array.isArray(snap.modifiersApplied) &&
                    (snap.modifiersApplied as { code: string; nameFr: string; amountImpact: number }[]).map(
                      (m) => (
                        <DetailRow
                          key={m.code}
                          label={m.nameFr}
                          value={`${m.amountImpact >= 0 ? "+" : ""}${formatCurrency(m.amountImpact)}`}
                        />
                      ),
                    )}

                  <DetailRow
                    label={`Sous-total HT`}
                    value={formatCurrency(Number(snap.subtotalHt))}
                  />
                  <DetailRow
                    label={`TVA (${(Number(snap.tvaRate) * 100).toFixed(0)}%)`}
                    value={formatCurrency(Number(snap.tvaAmount))}
                  />

                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-text-primary">Total TTC</span>
                      <span className="text-lg font-bold font-mono text-brand-primary">
                        {formatCurrency(Number(snap.totalTtc))}
                      </span>
                    </div>
                  </div>

                  {snap.isOverridden && (
                    <div className="text-xs text-status-warning bg-status-warning-soft px-2 py-1 rounded-md mt-2">
                      ⚠ Tarif manuel — original:{" "}
                      {formatCurrency(Number(snap.overrideOriginalTotal ?? 0))}
                    </div>
                  )}

                  <p className="text-[11px] text-text-muted mt-3">
                    Version {snap.version} · {formatDateTime(snap.calculatedAt)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-4">
                  Aucun tarif calculé pour ce service.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable rows ── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-text-muted mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono text-text-primary">{value}</span>
    </div>
  );
}
