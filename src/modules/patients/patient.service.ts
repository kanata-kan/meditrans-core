import * as patientRepo from "./patient.repository";
import type { CreatePatientInput, UpdatePatientInput } from "./patient.types";

export async function listPatients(search?: string) {
  return patientRepo.findAllPatients(search);
}

export async function listPatientsByClient(clientId: number) {
  return patientRepo.findPatientsByClient(clientId);
}

export async function getPatient(id: number) {
  const patient = await patientRepo.findPatientById(id);
  if (!patient) throw new Error("Patient introuvable.");
  return patient;
}

export async function createPatient(input: CreatePatientInput) {
  return patientRepo.createPatient(input);
}

export async function updatePatient(id: number, input: UpdatePatientInput) {
  return patientRepo.updatePatient(id, input);
}

export async function deletePatient(id: number) {
  return patientRepo.deletePatient(id);
}

export async function countPatients() {
  return patientRepo.countPatients();
}
