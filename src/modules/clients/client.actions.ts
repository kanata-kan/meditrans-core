"use server";

import { revalidatePath } from "next/cache";
import { createClientSchema, updateClientSchema } from "./client.schema";
import * as clientService from "./client.service";
import type { ClientType } from "@/lib/constants";

export async function createClientAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createClientSchema.safeParse(raw);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  try {
    const client = await clientService.createClient(parsed.data);
    revalidatePath("/dashboard/clients");
    return { success: true as const, data: { id: client.id } };
  } catch {
    return { success: false as const, error: "Erreur lors de la création du client." };
  }
}

export async function updateClientAction(id: number, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateClientSchema.safeParse(raw);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  try {
    await clientService.updateClient(id, parsed.data);
    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${id}`);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Erreur lors de la mise à jour du client." };
  }
}

export async function deleteClientAction(id: number) {
  try {
    await clientService.deleteClient(id);
    revalidatePath("/dashboard/clients");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Impossible de supprimer ce client (des données y sont liées)." };
  }
}

export async function listClientsAction(search?: string, type?: ClientType) {
  try {
    const clients = await clientService.listClients({ search, type });
    return { success: true as const, data: clients };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement des clients." };
  }
}

export async function getClientAction(id: number) {
  try {
    const client = await clientService.getClient(id);
    return { success: true as const, data: client };
  } catch {
    return { success: false as const, error: "Client introuvable." };
  }
}
