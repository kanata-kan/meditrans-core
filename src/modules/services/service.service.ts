import { calculatePrice } from "@/modules/pricing/pricing.engine";
import * as serviceRepo from "./service.repository";
import type { CreateServiceInput, UpdateServiceStatusInput } from "./service.types";
import { validateUrgentScheduling } from "./service.utils";

export async function createService(
  input: CreateServiceInput,
  createdById: number,
  creatorRole: string,
) {
  const scheduledAt = new Date(input.scheduledAt);

  if (!validateUrgentScheduling(input.urgency, scheduledAt)) {
    throw new Error(
      "Un service urgent doit être planifié dans les 2 prochaines heures.",
    );
  }

  const service = await serviceRepo.createService({
    patientId: input.patientId,
    clientId: input.clientId,
    catalogCode: input.catalogCode,
    status: "pending",
    urgency: input.urgency,
    fromLocation: input.fromLocation,
    toLocation: input.toLocation,
    distanceKm: input.distanceKm,
    staffType: input.staffType,
    durationHours: input.durationHours,
    scheduledAt,
    notes: input.notes,
    createdById,
  });

  await calculatePrice(
    {
      catalogCode: input.catalogCode,
      scheduledAt,
      isUrgent: input.urgency === "urgent",
      distanceKm: input.distanceKm,
      staffType: input.staffType,
      durationHours: input.durationHours,
      selectedModifiers: input.selectedModifiers,
      manualOverride: input.manualOverride,
    },
    createdById,
    creatorRole,
    { persist: true, serviceId: service.id },
  );

  return service;
}

export async function listServices(filters?: {
  status?: string;
  clientId?: number;
  patientId?: number;
}) {
  return serviceRepo.findAllServices(filters);
}

export async function getService(id: number) {
  const service = await serviceRepo.findServiceById(id);
  if (!service) throw new Error("Service introuvable.");
  return service;
}

export async function updateServiceStatus(
  id: number,
  input: UpdateServiceStatusInput,
) {
  return serviceRepo.updateServiceStatus(id, input.status);
}

export async function listUninvoicedServices(clientId: number) {
  return serviceRepo.findUninvoicedServicesByClient(clientId);
}
