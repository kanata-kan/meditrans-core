"use server";

import { revalidatePath } from "next/cache";
import { createPatientSchema, updatePatientSchema } from "./patient.schema";
import * as patientService from "./patient.service";

export async function createPatientAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createPatientSchema.safeParse(raw);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  try {
    const patient = await patientService.createPatient(parsed.data);
    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
    return { success: true as const, data: { id: patient.id } };
  } catch {
    return { success: false as const, error: "Erreur lors de la création du patient." };
  }
}

export async function updatePatientAction(id: number, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updatePatientSchema.safeParse(raw);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten() };

  try {
    await patientService.updatePatient(id, parsed.data);
    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${id}`);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Erreur lors de la mise à jour du patient." };
  }
}

export async function deletePatientAction(id: number) {
  try {
    await patientService.deletePatient(id);
    revalidatePath("/dashboard/patients");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Impossible de supprimer ce patient (des données y sont liées)." };
  }
}

export async function listPatientsAction(search?: string) {
  try {
    const patients = await patientService.listPatients(search);
    return { success: true as const, data: patients };
  } catch {
    return { success: false as const, error: "Erreur lors du chargement des patients." };
  }
}

export async function getPatientAction(id: number) {
  try {
    const patient = await patientService.getPatient(id);
    return { success: true as const, data: patient };
  } catch {
    return { success: false as const, error: "Patient introuvable." };
  }
}
