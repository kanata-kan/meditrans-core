"use server";

import { createClientSchema, updateClientSchema } from "./client.schema";
import * as clientService from "./client.service";

export async function createClientAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createClientSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    const client = await clientService.createClient(parsed.data);
    return { success: true, data: { id: client.id } };
  } catch {
    return { success: false, error: "Erreur lors de la création du client." };
  }
}

export async function updateClientAction(id: number, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateClientSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    await clientService.updateClient(id, parsed.data);
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la mise à jour du client." };
  }
}

export async function listClientsAction(search?: string) {
  try {
    const clients = await clientService.listClients(search);
    return { success: true, data: clients };
  } catch {
    return { success: false, error: "Erreur lors du chargement des clients." };
  }
}
