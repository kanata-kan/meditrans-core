"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { calculatePrice } from "@/modules/pricing/pricing.engine";
import { getSystemConfig } from "@/lib/config";
import { createServiceSchema, previewPriceSchema, updateServiceStatusSchema } from "./service.schema";
import * as serviceService from "./service.service";
import type { PricingResult } from "@/modules/pricing/pricing.types";

// TODO: Replace with real auth in Phase 09
const TEMP_USER = { id: 1, role: "admin" };

export async function createServiceAction(rawInput: unknown) {
  const parsed = createServiceSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  try {
    const service = await serviceService.createService(
      parsed.data,
      TEMP_USER.id,
      TEMP_USER.role,
    );
    revalidatePath("/dashboard/services");
    return { success: true as const, data: { id: service.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création du service.";
    return { success: false as const, error: message };
  }
}

export async function updateServiceStatusAction(id: number, rawInput: unknown) {
  const parsed = updateServiceStatusSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  try {
    await serviceService.updateServiceStatus(id, parsed.data);
    revalidatePath("/dashboard/services");
    revalidatePath(`/dashboard/services/${id}`);
    return { success: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour du statut.";
    return { success: false as const, error: message };
  }
}

export async function listServicesAction(filters?: {
  status?: string;
  clientId?: number;
}) {
  try {
    const services = await serviceService.listServices(filters);
    return { success: true as const, data: services };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement des services." };
  }
}

export async function getServiceAction(id: number) {
  try {
    const service = await serviceService.getService(id);
    return { success: true as const, data: service };
  } catch {
    return { success: false as const, error: "Service introuvable." };
  }
}

export async function listUninvoicedServicesAction(clientId: number) {
  try {
    const services = await serviceService.listUninvoicedServices(clientId);
    return { success: true as const, data: services };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement des services." };
  }
}

/* ── Helper loaders for the ServiceForm selects ── */

export async function loadFormDataAction() {
  try {
    const [clients, catalogs, modifiers, config] = await Promise.all([
      db.client.findMany({
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      }),
      db.serviceCatalog.findMany({
        where: { isActive: true },
        select: { code: true, nameFr: true, category: true, requiresDistance: true, requiresStaffType: true },
        orderBy: { nameFr: "asc" },
      }),
      db.pricingModifier.findMany({
        where: { isActive: true },
        select: { code: true, nameFr: true, type: true, value: true },
      }),
      getSystemConfig(),
    ]);
    return {
      success: true as const,
      data: {
        clients: clients.map((c) => ({ id: c.id, name: c.name, type: c.type })),
        catalogs: catalogs.map((c) => ({
          code: c.code,
          nameFr: c.nameFr,
          category: c.category,
          requiresDistance: c.requiresDistance,
          requiresStaffType: c.requiresStaffType,
        })),
        modifiers: modifiers.map((m) => ({
          code: m.code,
          nameFr: m.nameFr,
          type: m.type,
          value: Number(m.value),
        })),
        nightConfig: {
          NIGHT_START_HOUR: config.NIGHT_START_HOUR,
          NIGHT_END_HOUR: config.NIGHT_END_HOUR,
        },
      },
    };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement des données." };
  }
}

export async function loadPatientsByClientAction(clientId: number) {
  try {
    const patients = await db.patient.findMany({
      where: { clientId },
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: "asc" },
    });
    return { success: true as const, data: patients };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement des patients." };
  }
}

export async function previewPriceAction(rawInput: unknown): Promise<{
  success: boolean;
  data?: PricingResult;
  error?: string;
}> {
  const parsed = previewPriceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Données invalides pour le calcul." };
  }

  try {
    const result = await calculatePrice(
      {
        catalogCode: parsed.data.catalogCode,
        scheduledAt: new Date(parsed.data.scheduledAt),
        isUrgent: parsed.data.urgency === "urgent",
        distanceKm: parsed.data.distanceKm,
        staffType: parsed.data.staffType,
        durationHours: parsed.data.durationHours,
        selectedModifiers: parsed.data.selectedModifiers,
        manualOverride: parsed.data.manualOverride,
      },
      TEMP_USER.id,
      TEMP_USER.role,
      { persist: false },
    );
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de calcul.";
    return { success: false, error: message };
  }
}
