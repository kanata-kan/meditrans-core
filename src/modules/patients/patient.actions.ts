"use server";

import { createPatientSchema, updatePatientSchema } from "./patient.schema";
import * as patientService from "./patient.service";

export async function createPatientAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createPatientSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    const patient = await patientService.createPatient(parsed.data);
    return { success: true, data: { id: patient.id } };
  } catch {
    return { success: false, error: "Erreur lors de la création du patient." };
  }
}

export async function updatePatientAction(id: number, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updatePatientSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    await patientService.updatePatient(id, parsed.data);
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la mise à jour du patient." };
  }
}
