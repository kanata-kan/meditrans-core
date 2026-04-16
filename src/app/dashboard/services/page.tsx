import { listServicesAction } from "@/modules/services/service.actions";
import { ServicesPageClient } from "./_components/ServicesPageClient";

export default async function ServicesPage() {
  const result = await listServicesAction();
  const raw = result.success ? result.data : [];

  const services = raw.map((s) => ({
    id: s.id,
    catalogCode: s.catalogCode,
    status: s.status,
    urgency: s.urgency,
    fromLocation: s.fromLocation,
    toLocation: s.toLocation,
    distanceKm: Number(s.distanceKm),
    scheduledAt: s.scheduledAt.toISOString(),
    patient: { id: s.patient.id, fullName: s.patient.fullName },
    client: { id: s.client.id, name: s.client.name },
    catalog: { nameFr: s.catalog.nameFr },
    snapshots: s.snapshots.map((snap) => ({ totalTtc: Number(snap.totalTtc) })),
  }));

  return <ServicesPageClient initialServices={services} />;
}
