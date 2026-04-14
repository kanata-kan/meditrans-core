"use server";

import { createServiceSchema, updateServiceStatusSchema } from "./service.schema";
import * as serviceService from "./service.service";

export async function createServiceAction(
  rawInput: unknown,
  createdById: number,
  creatorRole: string,
) {
  const parsed = createServiceSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    const service = await serviceService.createService(
      parsed.data,
      createdById,
      creatorRole,
    );
    return { success: true, data: { id: service.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création du service.";
    return { success: false, error: message };
  }
}

export async function updateServiceStatusAction(id: number, rawInput: unknown) {
  const parsed = updateServiceStatusSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    await serviceService.updateServiceStatus(id, parsed.data);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour du statut.";
    return { success: false, error: message };
  }
}

export async function listUninvoicedServicesAction(clientId: number) {
  try {
    const services = await serviceService.listUninvoicedServices(clientId);
    return { success: true, data: services };
  } catch {
    return { success: false, error: "Erreur lors du chargement des services." };
  }
}
